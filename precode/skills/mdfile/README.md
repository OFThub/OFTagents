# mdfile

`precode` plugin'inin tek skill'i. Bir projenin taşıması beklenen markdown dokümanlarını,
o projenin gerçekte ne olduğuna uyarlayarak üretir.

> `SKILL.md` Claude'un yüklediği dosyadır. Bu `README.md` insan içindir — skill'i
> anlamak veya geliştirmek isteyenler için. Auto-discovery yalnızca `SKILL.md`'ye bakar,
> ikisi aynı klasörde sorunsuz durur.

## Dört adım

| Adım | Yapılan | Neden |
| --- | --- | --- |
| 1. Tespit | Kök, `.github/`, `docs/` taranır | Var olanın üzerine asla yazılmaz |
| 2. Profilleme | `package.json`, `go.mod`, `git remote`, dizin şekli okunur | Çıkarılan her bilgi, sorulmayan bir sorudur |
| 3. Sorma | **Tek** `AskUserQuestion`, ≤4 soru | Yalnızca 2. adımın cevaplayamadıkları |
| 4. Üretim | Şablon + katalog → dolu dosya | Yapı doğaçlama değil, yayımlanmış standarttan |

2. adım skill'in değerinin durduğu yer. Onsuz bu bir şablon boşaltıcısı olurdu.
`package.json`'da yazan proje adını kullanıcıya sormak, skill'e olan güveni bitirir.

## Doküman katmanları

Kapı yalnızca **çekirdeği** zorlar. Üst katmanlar önerilir, dayatılmaz — hem sert blok
hem on iki dosya dayatması katlanılmaz olurdu.

| Katman | Dosyalar | Ne zaman |
| --- | --- | --- |
| Çekirdek | `README.md`, `CLAUDE.md`, `CHANGELOG.md` | her zaman |
| Açık kaynak | `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `LICENSE`, `.github/*` | public remote |
| Karmaşık | `ARCHITECTURE.md`, `docs/adr/*`, `TESTING.md` | çok servisli/paketli |

Zorunlu liste burada değil, `${CLAUDE_PLUGIN_ROOT}/config/required-docs.json` içinde —
kapı da aynı dosyayı okur.

## Hangi standart, hangi dosya

`references/doc-catalog.md` her dosyayı yayımlanmış bir konvansiyona bağlar:

| Dosya | Standart |
| --- | --- |
| `README.md` | Standard Readme spec |
| `CHANGELOG.md` | Keep a Changelog 1.1.0 + SemVer 2.0.0 |
| `CONTRIBUTING.md` | GitHub community-health + Conventional Commits 1.0.0 |
| `SECURITY.md` | GitHub güvenlik politikası |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 (birebir) |
| `ARCHITECTURE.md` | arc42 (kısaltılmış) + C4 seviye 1-2 |
| `docs/adr/*` | Michael Nygard ADR formatı |
| normatif dil | RFC 2119 (MUST/SHOULD/MAY) |

## Klasör yapısı

| Yol | İçerik |
| --- | --- |
| `SKILL.md` | Claude'un yüklediği talimat. Yalın tutulur (~1.500 kelime). |
| `references/doc-catalog.md` | Standart eşlemesi. Yalnızca gerektiğinde yüklenir. |
| `assets/templates/` | Doldurulacak iskeletler. Bağlama yüklenmez, çıktıda kullanılır. |

Bu ayrım kademeli açığa çıkarma (progressive disclosure): metadata her zaman bağlamda,
`SKILL.md` skill tetiklendiğinde, `references/` ve `assets/` ancak gerektiğinde.

## Yeni doküman türü ekleme

1. `assets/templates/<DOSYA>.md` oluşturun, yer tutucuları `{{BUYUK_HARF}}` yazın.
2. `references/doc-catalog.md` içine bölüm sırasını ve bağlı olduğu standardı ekleyin.
3. Zorunlu olacaksa `config/required-docs.json` → `core` dizisine ekleyin.

Kod değişikliği gerekmez. Gerekiyorsa, konfigürasyona taşınması gereken bir şey koda
gömülmüş demektir.

## Değişmez kural

**Hiçbir `{{PLACEHOLDER}}` çıktıya sızmaz.** Doldurulmamış şablon, dosya olmamasından
kötüdür: dokümantasyon gibi görünür, hiçbir bilgi taşımaz. Doldurulamıyorsa ya sorulur
ya o bölüm tamamen silinir.
