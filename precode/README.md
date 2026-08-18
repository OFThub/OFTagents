# precode

Dokümansız bir projeye ilk kod yazımını **bir kez** engeller ve o projeye uygun sektör
standardı markdown doküman setini ürettirir.

Sorun şu: Claude Code, README'si olmayan bir projeye seve seve kod yazmaya başlar;
dokümanlar ya hiç yazılmaz ya da çok geç yazılır. Bunu tek başına bir skill çözemez —
skill'leri Claude kendi takdirine göre yükler. Garanti ancak bir hook ile mümkün.

## İki parça

| Parça | Görevi |
| --- | --- |
| `hooks/hooks.json` + `scripts/docs-gate.mjs` | **ne zaman** — `Write`/`Edit` üzerinde deterministik kapı |
| `skills/mdfile/` | **nasıl** — tespit, profilleme, eksik soru, standarttan üretim |
| `commands/docs.md` | elle kontrol — `/precode:docs` |

## Kapı nasıl karar verir

```
PreToolUse: Write | Edit
  │
  ├─ hedef .md / .markdown mi?            → İZİN   (kilitlenme koruması)
  ├─ hedef package.json, LICENSE, ...?    → İZİN   (skill profilleyebilsin diye)
  ├─ hedef proje kökünün dışında mı?      → İZİN   (scratchpad bizi ilgilendirmez)
  ├─ .claude/precode.json var mı?         → İZİN   (kullanıcı skip demiş)
  ├─ README + CLAUDE + CHANGELOG tam mı?  → İZİN
  └─ değilse                              → RED + "mdfile skill'ini çalıştır"
```

Birinci satır kritik: `.md` beyaz listesi olmadan kapı, kendi talep ettiği dokümanların
yazılmasını da engellerdi ve proje kapıyı asla açamazdı.

**Kapı hiçbir şey yazmaz.** Salt-okunur bir kontrolün yan etkisi olmamalı ve kullanıcının
projesinde izinsiz klasör açmamalı.

## Kurulum

```
/plugin marketplace add OFThub/OFTagents
/plugin install precode@oftagents
```

Tam URL de çalışır: `/plugin marketplace add https://github.com/OFThub/OFTagents`
Yerel geliştirme için klasör yolu: `/plugin marketplace add C:\Projects\OFTagents`

Sonra Claude Code'u **yeniden başlatın** — hook'lar yalnızca oturum başında yüklenir.
`/hooks` ile `PreToolUse` girdisinin listelendiğini doğrulayabilirsiniz.

## Komut

| Komut | Ne yapar |
| --- | --- |
| `/precode:docs check` | Durum raporu. Hiçbir şey yazmaz. |
| `/precode:docs init` | `mdfile` skill'ini elle çalıştırır. |
| `/precode:docs skip` | Bu proje için kapıyı kalıcı kapatır. |
| `/precode:docs unskip` | Kapıyı geri açar. |

## Özelleştirme

Zorunlu doküman listesi koda gömülü değil — `config/required-docs.json` içinde:

| Alan | Anlamı |
| --- | --- |
| `core` | Kapının aradığı dosyalar. Bunu değiştirmek kod değil veri değişikliğidir. |
| `allowExtensions` | Asla engellenmeyen uzantılar. **`.md`'yi silmeyin** — kapı kilitlenir. |
| `allowFilenames` | Asla engellenmeyen dosya adları (manifest'ler). Büyük/küçük harf duyarsız. |
| `stateFile` | `skip` durumunun yazıldığı yol, proje köküne göreli. |

Bu dosyayı hem kapı hem skill okur. Tek doğruluk kaynağı olması bilinçli: iki ayrı liste
tutulsaydı biri diğerinden sapar ve kapı, skill'in ürettiği setle asla tatmin olmazdı.

## Bilinen ödünler

**Node başlatma gecikmesi.** Kapı her `Write`/`Edit` için bir Node süreci doğurur
(~200-400 ms) ve bu maliyet dokümanlar tamamlandıktan sonra da sürer. Önbellek çözmez —
süre `stat` çağrılarından değil Node'un açılışından gelir. Yalnızca `Write` ile
eşleştirmek ucuzlatırdı ama mevcut/dokümansız projelerde Claude çoğunlukla yalnızca
`Edit` yapar ve kapı hiç tetiklenmezdi. Rahatsız ediyorsa `/precode:docs skip`.

**Varlık kontrol edilir, kalite değil.** Boş bir `README.md` kapıyı açar. Kapı bir
bootstrap yardımcısıdır, uyumluluk denetçisi değil.

**Monorepo kapsam dışı.** Kök dokümanlıysa `packages/*` altı sorgulanmaz.

**Node yoksa kapı sessizce açılır.** Kabuk 127 döner; hook sözleşmesinde 2 dışındaki
çıkış kodu engellemeyen hatadır. Bilinçli tercih: bozuk bir kapı oturumu kilitlememeli.

## Geliştirme

```bash
node scripts/docs-gate.test.mjs
```

Framework yok, disk yok — `decide()` saf fonksiyon, dosya sistemi enjekte edilir.

Kapıyı elle denemek için:

```bash
echo '{"cwd":"/tmp/x","tool_name":"Write","tool_input":{"file_path":"/tmp/x/app.js"}}' \
  | node scripts/docs-gate.mjs
```

## Kaldırma

`/plugin uninstall precode`, ya da etkilenen projeye `.claude/precode.json` dosyasını
`{"status":"skipped"}` içeriğiyle bırakın.
