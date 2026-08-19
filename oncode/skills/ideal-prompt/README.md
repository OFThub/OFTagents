<div align="center">

# ideal-prompt

### Prompt'u kısaltmaz — sınırlar

<br/>

![Rules](https://img.shields.io/badge/kural-4%20grup-D97757)
![Surfaces](https://img.shields.io/badge/hedef-3%20token%20y%C3%BCzeyi-blue)
![Independent](https://img.shields.io/badge/ECC%20ba%C4%9F%C4%B1ml%C4%B1l%C4%B1%C4%9F%C4%B1-yok-brightgreen)

</div>

---

Bu dosya skill'i **anlamak ve geliştirmek** isteyenler için. Claude'un yüklediği dosya
[`SKILL.md`](SKILL.md); ayrım budur.

## Temel tez

> Prompt'un kendi token'ı gürültüdür. Kaldıraç, prompt'un ajana **ne yaptırdığındadır**.

Bu yüzden `ideal-prompt` bir "prompt güzelleştirici" değil. Ürettiği prompt çoğu zaman
girdiden **uzundur** — çünkü eklenen her satır, ondan çok daha pahalı bir şeyi ortadan
kaldırıyor.

## İki değişmez kural

| # | Kural | Neyi engeller |
|---|---|---|
| 1 | **Eklenen her satır kendini ödemeli** — bir araç çağrısını, bir düzeltme turunu ya da çıktı token'ını kaldırmalı | Refleksle güvenlik/performans/erişilebilirlik bölümü eklemeyi. Bu, ECC `prompt-optimizer`'ın yaptığı ve bizim yapmadığımız şey |
| 2 | **Niyet ve kapsam asla değişmez** | Sessiz kapsam kaymasını. Yanlış problemi çözen ucuz prompt değersizdir |

## Dört kural grubu

| Grup | Kestiği yüzey | Kurallar |
|---|---|---|
| **A — Yörünge** | 15k–120k, girdi | Yola çapala · kapsamı olumlu sınırla · doğrulanabilir kontrol · alt-ajan · var olan kalıp · tek konu · mod/model seçimi |
| **B — Yapı** | 2k–20k, girdi + cache | Koşullu XML · olumlu çerçeveleme · uzun içerik başa · dolgu temizliği · koşullu örnek |
| **C — Çıktı** | 5k–40k, **~5× fiyat** | Somut format kısıtı · giriş/kapanış yasağı · doğrudan cevap |
| **D — Dil** | çapraz | Prompt İngilizce · kod eseri `--language` |

En sık atlanan grup **C**. Çıktı hem daha pahalı hem de bağlama girip sonraki her turda
yeniden gönderiliyor — yani sınırsız bir cevap iki kez ödetiyor.

## Uygulanan kaynaklar

| Kaynak | Ne alındı |
|---|---|
| Anthropic — *Effective context engineering for AI agents* | Alt-ajan mimarisi, araç sonucu temizleme, XML/başlık ile bölümleme, minimal bilgi ilkesi |
| Claude Code — *Best practices* | `@dosya`, sınırlı keşif, doğrulanabilir kontrol, `/clear` vs `/compact`, plan modunun ne zaman gereksiz olduğu |
| Keşif maliyeti ölçümleri | "infinite exploration" kuyusunun 15k–60k aralığı |

**Alınmayanlar** ve gerekçeleri [`references/token-trajectory.md`](references/token-trajectory.md)
sonundaki anti-kalıplar tablosunda — LLMLingua tarzı sıkıştırma neden yanlış yüzey,
repoyu tarayarak dil tespiti neden kazancından pahalı.

## Yeni kural eklemek

1. Kuralı **hangi yüzeyi kestiğine** göre A/B/C/D'den birine yerleştir.
2. [`SKILL.md`](SKILL.md) içindeki ilgili tabloya tek satır ekle.
3. [`references/token-trajectory.md`](references/token-trajectory.md) içine bir **öncesi/sonrası
   çifti** ve kazandırdığı yüzeyi yaz.
4. Değişmez kural 1'i uygula: bu kural ne kadar token kaldırıyor? Cevap yoksa kural eklenmez.

Yeni bir görev tipi için varsayılan çıktı kısıtı ekliyorsan yer
[`references/prompt-shapes.md`](references/prompt-shapes.md) içindeki C1 tablosu.

## SKILL.md ile bu dosyanın farkı

| | `SKILL.md` | `README.md` |
|---|---|---|
| Okuyan | Claude | insan |
| Dil | İngilizce | Türkçe |
| Biçim | emir kipi, uygulanabilir adımlar | açıklama, gerekçe |
| Yüklenme | tetiklenince bağlama girer | hiç girmez |

Bu ayrım kasıtlı: `README.md` bağlama girmediği için uzun olabilir, `SKILL.md` her
tetiklenmede token yediği için ince tutulur. Detay `references/` altına iner ve yalnızca
gerektiğinde okunur.
