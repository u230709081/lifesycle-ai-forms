# Katkı rehberi

## Başlangıç

1. Projeyi kendi bilgisayarına klonla.
2. Node.js 18.18 veya daha yenisini kur.
3. `Baslat.bat` dosyasını çalıştır veya terminalde `npm start` komutunu ver.
4. Gerekirse `.env.example` dosyasını `.env` olarak kopyala ve kendi API anahtarlarını ekle. `.env` dosyasını GitHub'a yükleme.

## Değişiklik gönderme

1. `main` dalında doğrudan değişiklik yapma; yeni bir branch aç: `feature/kisa-aciklama` veya `fix/kisa-aciklama`.
2. Değişikliğini küçük ve tek bir konuya odaklı tut.
3. Değişiklikten sonra uygulamayı çalıştırıp ilgili akışı kontrol et.
4. Branch'ini GitHub'a gönder ve `main` dalına Pull Request aç.
5. Pull Request açıklamasında neyi değiştirdiğini ve nasıl kontrol ettiğini yaz. Arayüz değişikliklerinde ekran görüntüsü ekle.

## Güvenlik ve veri

- API anahtarlarını, `.env` dosyasını, gerçek müşteri bilgilerini, belgeleri veya yanıt kayıtlarını commit etme.
- Örnek veri kullan; gerçek kişisel verileri PR ekran görüntülerine ekleme.
- Veri modeli veya form akışını değiştirdiğinde README'yi de güncelle.
