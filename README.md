# OFTagents

OFT'un Claude Code plugin marketplace'i.

## Marketplace nedir, skill nedir

Üç katman var ve **skill doğrudan kurulamaz** — kurulabilir birim plugin'dir:

```
MARKETPLACE  oftagents          katalog. Hangi plugin'ler var, nereden gelirler.
   └── PLUGIN  precode          kurulabilir birim. /plugin install precode@oftagents
          └── SKILL  mdfile     yetenek. Claude göreve göre kendisi yükler.
              + hook            deterministik tetikleyici
              + command         /precode:docs
```

Kurulum plugin'i hedefler, tetikleme skill'i. Bir plugin birden fazla skill, komut, hook
ve agent taşıyabilir; hepsi plugin kurulunca birlikte gelir.

## Kurulum

```
/plugin marketplace add C:\Projects\OFTagents
/plugin install precode@oftagents
```

Ardından Claude Code'u **yeniden başlatın**. Hook'lar yalnızca oturum başında yüklenir;
yeniden başlatmadan kapı devreye girmez.

## Katalog

| Plugin | Ne yapar | Sürüm |
| --- | --- | --- |
| [precode](precode/) | Dokümansız bir projeye ilk kod yazımını engeller, sektör standardı `.md` setini üretir | 0.1.0 |

## Yeni plugin ekleme

1. Kökte yeni bir klasör açın: `OFTagents/<plugin-adi>/`
2. İçine `.claude-plugin/plugin.json` koyun (en az `name`; ayrıca `version`, `description`).
3. `.claude-plugin/marketplace.json` içindeki `plugins` dizisine kayıt düşün:

```json
{
  "name": "<plugin-adi>",
  "description": "...",
  "source": "./<plugin-adi>",
  "category": "...",
  "author": { "name": "OFT" }
}
```

`source` göreli tutulur — marketplace ileride GitHub'a taşınırsa tek satır bile değişmez.

Bileşenler (`commands/`, `skills/`, `agents/`, `hooks/`) plugin **kökünde** durur,
`.claude-plugin/` içinde değil. `.claude-plugin/` yalnızca manifest'i tutar.

## Mevcut plugin'e yeni skill ekleme

`precode/skills/<skill-adi>/SKILL.md` oluşturmak yeterli — otomatik keşfedilir, hiçbir
dosyaya kayıt düşmek gerekmez. Ayrı kurulabilmesi gerekiyorsa skill değil yeni bir plugin
açın.

## Yerelden GitHub'a

Yapı bugün yerel çalışıyor, taşınması için değişiklik gerektirmez:

```bash
git remote add origin <url>
git push -u origin main
# kullanıcılar: /plugin marketplace add <url>
```
