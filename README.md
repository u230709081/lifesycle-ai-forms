# Formika — Sektör bağımsız form platformu (POC)

Lifesycle `piq-document-scan` prototipindeki belge okuma, bulunan cevabın kanıtını gösterme ve müşteri onayı fikirlerini sektör bazlı form akışına taşıyan bir POC.

## Başlatma

Node.js 18.18 veya üzeri gerekir; ek paket indirmek gerekmez.

- En kolay yol: `Baslat.bat` dosyasına çift tıklayın. İlk çalıştırmada `.env.example` dosyasından `.env` ayar dosyası oluşturulur; sunucu başlar ve tarayıcı `http://localhost:3000` adresini açar. Geçerli sağlayıcı anahtarlarını bu `.env` dosyasına kendiniz ekleyin; anahtarlar kaynak koda veya tarayıcıya konmamalıdır.
- Alternatif: bu klasörde `npm start` çalıştırın, ardından `http://localhost:3000` adresini açın.
- `index.html` dosyasını doğrudan açarsanız yerel önizleme modu çalışır. Bu modda formlar yalnızca aynı tarayıcı profilinde saklanır; bağlantıyı başka kişiye vermek için `Baslat.bat` ile sunucuyu başlatın.

AI ile form/soru üretimi ve belge okuma için `.env` içine `ANTHROPIC_API_KEY` ekleyin. Ses yükleyip yazıya çevirme için ayrıca `OPENAI_API_KEY` gerekir. Bu anahtarlar olmadan sektör şablonları ve açıklama metninde açıkça yazılmış ad, görev, e-posta, telefon, adres gibi alanları bulan yerel demo çalışır.

## Lifesycle CRM bağlantısı

Emlak formu şu anda prototipte açıkça belirtilmiş bir demo Lifesycle kaydıyla açılır. Canlı Lifesycle verisini (iletişim kişisi, e-posta/telefon, mülk adresi ve ek `knownData`) çekmek için `.env` dosyasına `LIFESYCLE_RECORD_URL` ve gerekiyorsa `LIFESYCLE_API_TOKEN` ekleyin. URL, `{contact_id}` yer tutucusu içermeli ve JSON olarak `contact: { name, email, phone }`, `property: { address }`, isteğe bağlı `knownData` alanlarını döndürmelidir. Arayüzdeki “Lifesycle kaydını al” düğmesi bu kaydı çeker. Canlı erişim bilgileri bu çalışma alanında paylaşılmadığından, şu an gerçek CRM hesabından veri alındığını iddia etmiyoruz.


## GitHub ile ekip çalışması

Projeyi GitHub'a yükledikten sonra takım arkadaşlarını depo ayarlarından collaborator olarak davet edebilirsin. Herkes `main` dalına doğrudan yazmak yerine kendi branch'inde çalışıp Pull Request açsın. API anahtarları `.env` dosyasında kalır; `.gitignore` bu dosyayı, yerel `data/` kayıtlarını ve yüklenen belgeleri Git dışında tutar. Ayrıntılar için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## Özellikler

- Emlak satışı, çalışan işe giriş ve otel giriş taslakları.
- Form amacından soru önerme; AI anahtarı yokken sektör taslaklarını kullanma.
- Form başlığı, bölümleri, soruları, zorunluluk ve basit görünürlük koşullarını düzenleme.
- Formu JSON dosyasına kaydetme ve müşteri bağlantısı üretme.
- Müşteriden serbest açıklama, belge ve ses kaydı alma; açıkça desteklenen yanıtları kaynak/kanıtla önerme ve müşteri onayına sunma.
- Müşterinin yanıtı kabul etmesi, reddetmesi/düzenlemesi, ilerlemesini görmesi ve kaldığı yerden sürdürmesi.
- Yeni sektörleri `public/js/app.js` içindeki `templates` yapılandırmasına ekleme.

Ses transkripsiyonu OpenAI Audio API ile yapılır; ses dosyası işlenmek üzere API sağlayıcısına gönderilir. Form ve yanıt kayıtları `data/forms.json` içinde tutulur. İlk POC; oturum açma, rol yönetimi, kalıcı belge deposu ve üretim seviyesi gizlilik/erişim kontrolleri içermez. Sektörel ve hukuki gereklilikler uzmanlarca tanımlanmalıdır.
