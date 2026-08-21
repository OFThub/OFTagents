<div align="center">

# lean-reply

### Cevabı kısaltmaz — yoğunlaştırır

</div>

---

## Temel tez

`ideal-prompt` **girdi** yüzeyini optimize eder. `lean-reply` **çıktı** yüzeyini:
oturum başına 5k–40k token, girdinin kabaca **5× fiyatı**, ve sonraki her turda
yeniden gönderilir. Bir kez yazılan paragrafın bedeli defalarca ödenir.

Hedef daha **kısa** cevap değil, daha **yoğun** cevap: aynı gerçekler, daha az kelime.
Kullanıcının ihtiyacı olan bir şeyi gizleyerek token tasarruf eden cevap, tasarruf değil
hatadır.

## İki taraflı sözleşme

| Taraf | Kural |
|---|---|
| **Kesilen** | Giriş cümlesi · yapılan işin özet tekrarı · dosyaya yazılmış kodun yanıta yapıştırılması (yerine `path:line`) · araç çıktısının yeniden anlatımı · kapanış nezaketi · isteğin geri okunması · tek gerçeği listeye çevirme |
| **Asla kesilmeyen** | Başarısızlık ve kısmi tamamlanma · yapılan varsayım · geri alınamaz işlem · gereken dosya yolu ve komut · atlanan kapsam ve nedeni · bir sonraki hamleyi değiştiren her gerçek |

İkinci sütun kullanıcının şartıdır: *"eksik bilgi de almamalı, koda hâkim olabilmeli."*
Değişmez kural tek cümle: **bir gerçeği kelime sayısına asla takas etme.**

## Öncelik sırası — neyi ezmez

| Sıra | Kaynak |
|---|---|
| 1 | **Kullanıcının açık isteği** — "detaylı anlat", "tam raporu ver" |
| 2 | **Aktif output style** — `★ Insight` bloğu zorunlu kılan öğretici bir stil |
| 3 | **lean-reply** — yukarıdaki ikisinin istemediği her şey |

Skill yalnızca **hiç kimsenin talep etmediği** metni keser. Bilinçli açtığın bir output
style'ı susturmaz; "kısa ol" hiçbir zaman istenen işi yapmamanın gerekçesi değildir.

## Bayraklar

| Komut | Etki |
|---|---|
| `/oncode:lean-reply --open` | Cevaplar şekillendirilir. **Varsayılan bu** |
| `/oncode:lean-reply --close` | Cevaplar doğal uzunluğuna döner |
| `/oncode:lean-reply --status` | İki anahtarı da bildirir |

İki anahtar bağımsızdır: `ideal-prompt`'u kapatmak cevap biçimlendirmeyi durdurmaz.

## Neden skill dosyası her prompt'ta okunmuyor

Hook'un enjekte ettiği satır **operatif kuralın tamamını** taşır ve açıkça
"skill dosyasını yükleme" der. Alternatif — enjeksiyonun "lean-reply skill'ini aç"
demesi — her prompt'ta ~1.5k token'lık `SKILL.md` okuması demekti; skill kendi
tasarruf ettiğinden fazlasını yakardı.

Metin `config/prompt-rules.json` içindeki `replyDirective` alanında durur, kodda değil.
Tonu değiştirmek isteyen o tek satırı düzenler; test onu enjeksiyon bütçesine bağlar.

## Ödün — gizlenmiyor

Direktif baypas edilmeyen her prompt'a eklenir; onay turlarına (`evet`, `devam`) ve
slash komutlarına da. Bedeli prompt başına ~65 token.

Bu bilinçli: `ideal-prompt` onay turlarını baypas eder çünkü orada yeniden yazacak bir
prompt yoktur — ama `evet` genellikle **asıl işi ve arkasından gelen yazıyı** başlatan
şeydir, yani modelin en çok savrulduğu yer. Oraya enjekte etmemek kazancın çoğunu
kaçırırdı.

## SKILL.md ile bu dosyanın farkı

| | `SKILL.md` | `README.md` |
|---|---|---|
| Okuyan | Claude | insan |
| Dil | İngilizce | Türkçe |
| Biçim | emir kipi, uygulanabilir adımlar | açıklama, gerekçe |
| Yüklenme | yalnızca bayrak işlerken veya kural tartışılırken | hiç girmez |
