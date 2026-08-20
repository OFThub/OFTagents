# OFTagents

Claude Code plugin marketplace. Kök `.claude-plugin/marketplace.json` bir katalogdur;
her plugin kökteki kendi klasöründe yaşar ve göreli `source` ile kataloğa bağlanır.

Şu an tek plugin var: `precode` — dokümansız projeye ilk kod yazımını engelleyen bir
`PreToolUse` hook'u ve dokümanları üreten `mdfile` skill'i.

## Commands

| Task | Command |
| --- | --- |
| Test (gate logic) | `node precode/scripts/docs-gate.test.mjs` |
| Test (prompt mode) | `node oncode/scripts/prompt-mode.test.mjs` |
| Benchmark (para harcar) | `node oncode/bench/bench.mjs --dry-run` once |
| Install locally | `/plugin marketplace add C:\Projects\OFTagents` |

Build adımı yok — plugin'ler yorumlanan dosyalardan oluşur. Bağımlılık yok, `package.json`
yok; `docs-gate.mjs` yalnızca Node yerleşiklerini kullanır.

## Architecture

| Path | Contains |
| --- | --- |
| `.claude-plugin/marketplace.json` | Katalog. Yeni plugin buraya kaydedilir. |
| `precode/.claude-plugin/plugin.json` | Plugin manifest'i. |
| `precode/config/required-docs.json` | Zorunlu doküman listesi — kapı ve skill'in ortak kaynağı. |
| `precode/scripts/docs-gate.mjs` | Saf `decide()` + `missingDocs()` + ince CLI kabuğu. |
| `precode/scripts/session-check.mjs` | `SessionStart` sorusu + `--decline` yazıcısı. |
| `precode/scripts/docs-gate.test.mjs` | `node:test`, framework yok, disk yok. |
| `precode/hooks/hooks.json` | `SessionStart` + `PreToolUse: Write\|Edit` kaydı. |
| `precode/commands/docs.md` | `/precode:docs` |
| `precode/skills/mdfile/` | `SKILL.md` + `references/` + `assets/templates/` |
| `oncode/.claude-plugin/plugin.json` | İkinci plugin manifest'i. |
| `oncode/config/prompt-rules.json` | Modlar, baypaslar, eşikler — hook ve skill'in ortak kaynağı. |
| `oncode/scripts/prompt-mode.mjs` | Saf `shouldOptimize()` + `contextPressure()` + ince CLI kabuğu. |
| `oncode/scripts/prompt-mode.test.mjs` | `node:test`, framework yok, disk yok. |
| `oncode/hooks/hooks.json` | `UserPromptSubmit` kaydı (matcher almaz). |
| `oncode/skills/ideal-prompt/` | `SKILL.md` + `references/` |
| `oncode/bench/` | Olcum harness'i, vakalar, fixture. Hook'lari kapatarak calisir. |

## Conventions

- Plugin içi her yol `${CLAUDE_PLUGIN_ROOT}` ile yazılır — mutlak yol asla.
- Bileşen klasörleri plugin **kökünde** durur; `.claude-plugin/` yalnızca manifest'i tutar.
- Kabuk script'i yerine Node: `jq` standart Windows'ta yok, Node her yerde var.
- Kapı saf bir fonksiyondur ve **hiçbir şey yazmaz**. Yan etkisi olan bir kontrol,
  kullanıcının projesine izinsiz dosya bırakır.
- Fail-open: kapı çökerse yazma devam eder. Bozuk bir kapı oturumu kilitlememeli.
- Şablon yer tutucuları tek biçimde değil: `{{PROJECT_NAME}}`, `{{path}}`,
  `{{WHAT_IT_IS — one paragraph}}`. Hiçbiri çıktıya sızmamalı ve sızıntı kontrolü **daima
  düz `{{` araması** olmalı — büyük harfe göre yazılmış bir desen çoğunu kaçırır.

## Constraints

- `config/required-docs.json` içindeki `allowExtensions` listesinden `.md` **asla**
  çıkarılmamalı — kapı kendi talep ettiği dokümanların yazılmasını engeller ve proje
  kilitlenir. `docs-gate.test.mjs` bunu "deadlock guard" testiyle korur.
- Oturum bazlı "hayır" kaydı **proje içine yazılmaz** — işletim sistemi temp'ine, oturum
  kimliğine göre. Kimlik dış payload'dan gelir; `declinePath()` düz oturum kimliği olmayan
  her şeyi reddeder, temizlemeye çalışmaz.
- "Eksik doküman" hesabı tek yerde: `missingDocs()`. Kapı ve oturum sorusu aynı fonksiyonu
  çağırır — ikinci bir kopya zamanla sapar ve sapmış bir kapı tatmin edilemez hale gelir.
- Zorunlu doküman listesi `docs-gate.mjs` içine gömülmemeli. Konfigürasyondan okunur;
  ikinci bir liste yaratmak kapıyı tatmin edilemez hale getirir.
- Hook değişiklikleri yalnızca Claude Code yeniden başlatılınca yüklenir; test etmeden
  önce oturumu yeniden başlatın.
- Benchmark (`oncode/bench/bench.mjs`) **hook'lar kapalı** çalışmak zorundadır
  (`--settings '{"disableAllHooks":true}'`). Açık bırakılırsa bu deponun kendi plugin'leri
  ölçümü geçersiz kılar: `precode` kapısı fixture'daki her `Edit`'i reddeder (fixture'da
  `CLAUDE.md` yoktur) ve `oncode`'un `UserPromptSubmit` hook'u **ham kola da** "ideal-prompt
  uygula" talimatını enjekte eder. İki koşu bu yüzden çöpe gitti ve tablo ideal kolu daha
  pahalı gösterdi — ölçülen şey görevin maliyeti değil, kapıyla boğuşmanın maliyetiydi.
- Benchmark çıktısındaki `permission_denials` uyarısı **görmezden gelinmemeli**. Reddedilmiş
  bir araç varsa o satır görevin maliyetini değil, engelin maliyetini ölçüyordur.
- README'deki hiçbir sayı ölçümle çelişmemeli. `oncode/README.md` bir kez "10–50× kazanç"
  iddia etti; benchmark bunu desteklemedi ve iddia ölçülen değerle değiştirildi.
