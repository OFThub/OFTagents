<div align="center">

# mdfile

### Projenin ne olduğuna bakarak dokümantasyonunu üreten skill

Şablon boşaltıcısı değil: önce projeyi profiller, çıkarabildiğini çıkarır,
yalnızca çıkaramadığını sorar.

<br/>

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](SKILL.md)
![Templates](https://img.shields.io/badge/%C5%9Fablon-12-blue)
![Doc types](https://img.shields.io/badge/dok%C3%BCman%20t%C3%BCr%C3%BC-11-blue)
![Standards](https://img.shields.io/badge/yay%C4%B1mlanm%C4%B1%C5%9F%20standart-8-D97757)
![Questions](https://img.shields.io/badge/soru-tek%20turda%20%E2%89%A44-brightgreen)

</div>

---

> [!NOTE]
> **`SKILL.md` Claude'un yüklediği dosyadır. Bu `README.md` insan içindir.** Auto-discovery
> yalnızca `SKILL.md`'ye bakar, ikisi aynı klasörde sorunsuz durur.

---

## Nasıl tetiklenir

| Yol | Kullanıcı onay verdi mi |
| --- | --- |
| **Oturum sorusu** — precode eksik dokümanları bildirir, Claude bir kez sorar | **Evet**, "evet" dedi. Doğrudan 1. adım. |
| **Reddedilen yazma** — kapı kod yazımını engelledi | Hayır. Önce teklif edilir. |
| **Doğrudan istek** veya `/precode:docs init` | Örtük evet. Doğrudan 1. adım. |

Kullanıcı oturum sorusuna **hayır** derse skill çalışmaz ve konu o oturumda bir daha
açılmaz. Reddi kaydetmek kapının da susmasını sağlar:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/session-check.mjs" --decline <session_id>
```

Bu komut çalıştırılmazsa kapı ilk kod yazımını yine engeller ve "hayır" hiçbir şey ifade
etmemiş olur.

## Akış

```mermaid
flowchart LR
    A["1. Tespit<br/>kök, .github, docs taranır"] --> B["2. Profilleme<br/>manifest, git, dizin şekli"]
    B --> C["3. Sorma<br/>tek AskUserQuestion, ≤4 soru"]
    C --> D["4. Üretim<br/>şablon + katalog → dolu dosya"]
```

| Adım | Yapılan | Neden |
| --- | --- | --- |
| **1. Tespit** | Kök, `.github/`, `docs/` taranır | Var olanın üzerine **asla** yazılmaz |
| **2. Profilleme** | `package.json`, `go.mod`, `git remote`, dizin şekli okunur | Çıkarılan her bilgi, sorulmayan bir sorudur |
| **3. Sorma** | **Tek** `AskUserQuestion`, ≤4 soru | Yalnızca 2. adımın cevaplayamadıkları |
| **4. Üretim** | Şablon + katalog → dolu dosya | Yapı doğaçlama değil, yayımlanmış standarttan |

2. adım skill'in değerinin durduğu yer. Onsuz bu bir şablon boşaltıcısı olurdu.
`package.json`'da yazan proje adını kullanıcıya sormak, skill'e olan güveni bitirir.

## Doküman katmanları

Kapı yalnızca **çekirdeği** zorlar. Üst katmanlar önerilir, dayatılmaz — hem sert blok hem
on iki dosya dayatması katlanılmaz olurdu.

| Katman | Dosyalar | Ne zaman |
| --- | --- | --- |
| 🟥 **Çekirdek** | `README.md` · `CLAUDE.md` · `CHANGELOG.md` | her zaman |
| 🟨 **Açık kaynak** | `CONTRIBUTING` · `SECURITY` · `CODE_OF_CONDUCT` · `LICENSE` · `.github/*` | public remote |
| 🟦 **Karmaşık** | `ARCHITECTURE.md` · `docs/adr/*` · `TESTING.md` | çok servisli / çok paketli |
| 🟪 **Topluluk** | `SUPPORT.md` · `GOVERNANCE.md` | sorular tracker dışına taşınca · birden fazla merge yetkisi olunca |
| 🟨 **Ajan araçları** | `CLAUDE.local.md` · `MEMORY.md` · `.claude/rules/*.md` · `SKILL.md` · `AGENTS.md` · `copilot-instructions.md` | yalnızca istek üzerine |

Zorunlu liste burada değil, `${CLAUDE_PLUGIN_ROOT}/config/required-docs.json` içinde — kapı da
aynı dosyayı okur.

> **Ajan araçları katmanı kendiliğinden üretilmez.** `AGENTS.md` ve `copilot-instructions.md`
> her biri `CLAUDE.md`'nin ikinci kopyası olur ve zamanla ondan sapar — okuyan hangisinin
> bayat olduğunu anlayamaz. `CLAUDE.local.md` ise gitignore'a girmezse bir kişinin yerel
> yollarını tüm takıma dayatır; tam da önlemek için var olduğu şeyi yapar.

## Hedefli mod

Tek bir dosyayı oluşturmak ya da geliştirmek için:

```
/precode:mdfile --CODE_OF_CONDUCT     # tek dosya
/precode:mdfile --security            # küçük harf, kısaltma, .md eki — hepsi olur
/precode:mdfile --RULES testing       # dosya adı sabit değilse ikinci argüman
```

| Dosyanın durumu | Ne olur |
| --- | --- |
| **Yok** | Proje profillenir, şablondan üretilir |
| **Var** | **Geliştirilir, üzerine yazılmaz** — eksik bölümler eklenir, artık doğru olmayan iddialar düzeltilir, hâlâ doğru olan cümleler olduğu gibi bırakılır |

Var olan bir dosyayı iyileştirirken doğru cümleyi kendi üslubuna çevirmek geliştirme değil
gürültüdür: gerçek değişikliği diff içinde görünmez kılar.

Ad çözümlemesi `references/doc-catalog.md` içindeki **tek** tabloda. Büyük/küçük harf, `-`,
`_` ve sondaki `.md` yok sayılır; `--CODE_OF_CONDUCT`, `--code-of-conduct` ve `--coc` aynı
satıra düşer. Tanınmayan bir ad sessizce geçilmez — verilen ad söylenir, en yakın satırlar
listelenir ve durulur. Hiçbir standardın arkasında olmadığı bir doküman türü uydurulmaz.

## Hangi standart, hangi dosya

`references/doc-catalog.md` her dosyayı yayımlanmış bir konvansiyona bağlar; üretim doğaçlama
olmaz.

| Dosya | Standart |
| --- | --- |
| `README.md` | [Standard Readme](https://github.com/RichardLitt/standard-readme) spec |
| `CHANGELOG.md` | [Keep a Changelog 1.1.0](https://keepachangelog.com) + [SemVer 2.0.0](https://semver.org) |
| `CONTRIBUTING.md` | GitHub community-health + [Conventional Commits 1.0.0](https://www.conventionalcommits.org) |
| `SECURITY.md` | GitHub güvenlik politikası şeması |
| `CODE_OF_CONDUCT.md` | [Contributor Covenant 2.1](https://www.contributor-covenant.org) — birebir |
| `ARCHITECTURE.md` | [arc42](https://arc42.org) (kısaltılmış) + [C4](https://c4model.com) seviye 1-2 |
| `docs/adr/*` | [Michael Nygard ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) formatı |
| normatif dil | [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — MUST / SHOULD / MAY |

## Klasör yapısı

```
skills/mdfile/
├── SKILL.md                     ← Claude'un yüklediği talimat (~1.500 kelime)
├── README.md                    ← bu dosya, insan için
├── references/
│   └── doc-catalog.md           ← standart eşlemesi, yalnızca gerektiğinde yüklenir
└── assets/templates/            ← 21 iskelet, bağlama yüklenmez, çıktıda kullanılır
    ├── *.md                     ← kök dosyaları (README, SECURITY, LICENSE, …)
    ├── claude/                  ← Claude Code native: CLAUDE.local, MEMORY, SKILL, rules
    └── github/                  ← PR · ISSUE_TEMPLATE · copilot-instructions
    ├── README.md  CLAUDE.md  CHANGELOG.md
    ├── CONTRIBUTING.md  SECURITY.md  CODE_OF_CONDUCT.md
    ├── ARCHITECTURE.md  TESTING.md  adr-0001.md
    └── github/  (PR + issue şablonları)
```

Bu ayrım **kademeli açığa çıkarma** (progressive disclosure):

| Katman | Ne zaman bağlama girer |
| --- | --- |
| Frontmatter (`name`, `description`) | her zaman |
| `SKILL.md` gövdesi | skill tetiklendiğinde |
| `references/`, `assets/` | ancak gerektiğinde |

## Yeni doküman türü ekleme

<details>
<summary><strong>Üç adım, kod değişikliği yok</strong></summary>

<br/>

1. `assets/templates/<DOSYA>.md` oluşturun; yer tutucular `{{...}}` içine yazılır.
2. `references/doc-catalog.md` içine bölüm sırasını ve bağlı olduğu standardı ekleyin.
3. Zorunlu olacaksa `config/required-docs.json` → `core` dizisine ekleyin.

Kod değişikliği gerekmez. Gerekiyorsa, konfigürasyona taşınması gereken bir şey koda gömülmüş
demektir.

</details>

## Değişmez kural

> [!CAUTION]
> **Hiçbir `{{...}}` yer tutucusu çıktıya sızmaz.** Doldurulmamış şablon, dosya olmamasından
> kötüdür: dokümantasyon gibi görünür, hiçbir bilgi taşımaz. Doldurulamıyorsa ya sorulur ya o
> bölüm tamamen silinir.

Sızıntı kontrolü **daima düz `{{` araması** olmalıdır. Şablonlardaki yer tutucular tek biçimde
değil — `{{PROJECT_NAME}}`, `{{path}}`, `{{WHAT_IT_IS — one paragraph}}` gibi formlar var.
Büyük harfe göre yazılmış bir desen 71 yer tutucunun yalnızca 45'ini yakalar; **%37'si sessizce
kaçar.**

---

<div align="center">
<sub>

**mdfile** · [precode](../../) plugin'inin skill'i · MIT

</sub>
</div>
