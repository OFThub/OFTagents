# OFTagents

Claude Code plugin marketplace. Kök `.claude-plugin/marketplace.json` bir katalogdur;
her plugin kökteki kendi klasöründe yaşar ve göreli `source` ile kataloğa bağlanır.

Şu an tek plugin var: `precode` — dokümansız projeye ilk kod yazımını engelleyen bir
`PreToolUse` hook'u ve dokümanları üreten `mdfile` skill'i.

## Commands

| Task | Command |
| --- | --- |
| Test (gate logic) | `node precode/scripts/docs-gate.test.mjs` |
| Install locally | `/plugin marketplace add C:\Projects\OFTagents` |

Build adımı yok — plugin'ler yorumlanan dosyalardan oluşur. Bağımlılık yok, `package.json`
yok; `docs-gate.mjs` yalnızca Node yerleşiklerini kullanır.

## Architecture

| Path | Contains |
| --- | --- |
| `.claude-plugin/marketplace.json` | Katalog. Yeni plugin buraya kaydedilir. |
| `precode/.claude-plugin/plugin.json` | Plugin manifest'i. |
| `precode/config/required-docs.json` | Zorunlu doküman listesi — kapı ve skill'in ortak kaynağı. |
| `precode/scripts/docs-gate.mjs` | Saf `decide()` + ince CLI kabuğu. |
| `precode/scripts/docs-gate.test.mjs` | `node:test`, framework yok, disk yok. |
| `precode/hooks/hooks.json` | `PreToolUse: Write\|Edit` kaydı. |
| `precode/commands/docs.md` | `/precode:docs` |
| `precode/skills/mdfile/` | `SKILL.md` + `references/` + `assets/templates/` |

## Conventions

- Plugin içi her yol `${CLAUDE_PLUGIN_ROOT}` ile yazılır — mutlak yol asla.
- Bileşen klasörleri plugin **kökünde** durur; `.claude-plugin/` yalnızca manifest'i tutar.
- Kabuk script'i yerine Node: `jq` standart Windows'ta yok, Node her yerde var.
- Kapı saf bir fonksiyondur ve **hiçbir şey yazmaz**. Yan etkisi olan bir kontrol,
  kullanıcının projesine izinsiz dosya bırakır.
- Fail-open: kapı çökerse yazma devam eder. Bozuk bir kapı oturumu kilitlememeli.
- Şablonlarda yer tutucular `{{BUYUK_HARF}}` biçiminde; hiçbiri çıktıya sızmamalı.

## Constraints

- `config/required-docs.json` içindeki `allowExtensions` listesinden `.md` **asla**
  çıkarılmamalı — kapı kendi talep ettiği dokümanların yazılmasını engeller ve proje
  kilitlenir. `docs-gate.test.mjs` bunu "deadlock guard" testiyle korur.
- Zorunlu doküman listesi `docs-gate.mjs` içine gömülmemeli. Konfigürasyondan okunur;
  ikinci bir liste yaratmak kapıyı tatmin edilemez hale getirir.
- Hook değişiklikleri yalnızca Claude Code yeniden başlatılınca yüklenir; test etmeden
  önce oturumu yeniden başlatın.
