# PvhvErp Plesk Sunucu Kurulum ve Yayınlama Rehberi (http://erp.pvhvfood.com)

Bu rehber, projenizin hem frontend (istemci) hem de backend (sunucu) kısmını tek bir Node.js uygulamasında çalışacak şekilde (Plesk Node.js eklentisi kullanarak) nasıl yükleyip çalıştıracağınızı anlatır.

Bu mimaride, IIS proxy'sine ihtiyaç yoktur. Node.js eklentisi sitenin tüm trafiğini alır, `/api` dışındaki tüm istekler için derlenmiş React dosyalarını (Frontend) sunar.

## 1. Dosyaların Hazırlanması

1. **Backend Klasörü:**
   - Projenizdeki `backend` klasörünün içindeki tüm dosyaları (`package.json`, `index.js`, `routes` vd.) Plesk'teki `erp.pvhvfood.com` kök dizinine kopyalayın. *(Yani `index.js` ve diğer backend dosyaları direkt `httpdocs` veya kök dizinde olmalıdır).*
   - **Önemli:** Eğer `backend` adında bir alt klasör oluşturarak yüklediyseniz (örneğin `/erp.pvhvfood.com/backend` gibi), Plesk panelinizden **Belge Kökü (Document Root)** olarak o dizini gösterdiğinizden emin olun.

2. **Frontend Dosyalarının Eklenmesi:**
   - Frontend tarafında `npm run build` diyerek projenizi oluşturun (**dist** klasörü oluşacak).
   - Sunucuda, `index.js` dosyasının bulunduğu dizinde (backend projenizin ana dizini) **`public`** adında yeni, boş bir klasör oluşturun.
   - Oluşturduğunuz bu `public` klasörünün içerisine, frontend'deki `dist` dizini içerisinde bulunan *tüm dosyaları (`index.html`, `assets` vd.)* atın.
   
3. **Environment (.env) Ayarları:**
   - `index.js` dosyasının olduğu dizine `.env` adında bir dosya oluşturun. İçerisine veritabanı bilgilerinizi aşağıdaki gibi girin (Boşluk bırakmamaya dikkat edin):
     ```env
     PORT=5001
     DB_USER=plessk_veritabani_kullanici_adiniz
     DB_PASSWORD=plesk_veritabani_sifreniz
     DB_SERVER=localhost
     DB_DATABASE=plesk_veritabani_adiniz
     DB_PORT=1433
     JWT_SECRET=ornek_gizli_anahtar_degistirebilirsiniz
     ```
   - **Not:** Veritabanına ait şifrenizi ve kullanıcı adınızı doğru girdiğinizden emin olun, aksi halde *DB Connection Failed* hatası alarak Node.js çöker ve site açılmaz.

---

## 2. Plesk Üzerindeki Yapılandırmalar

1. Plesk kontrol panelinize giriş yapıp `erp.pvhvfood.com` alan adınıza tıklayın.
2. Ana ekrandan **Node.js** butonuna (veya "Node.js uygulamasını çalıştır" ayarlarına) tıklayın.
3. Node.js'i **Etkinleştirin**.
4. Aşağıdaki ayarları doğru yaptığınızdan emin olun:
   - **Belge Kökü:** Proje dosyalarınızın (`index.js`'in vs.) olduğu klasörü işaret etmelidir (Örneğin: `/erp.pvhvfood.com/backend`).
   - **Uygulama Modu:** `production` olmalıdır.
   - **Uygulama Başlatma Dosyası:** `index.js` olmalıdır.
   - **Paket Yöneticisi:** `npm` seçili olmalıdır.
5. Ayarlar sayfasındaki **"NPM kurulumu (NPM Install)"** butonuna basın. Bu komut, `package.json` içindeki gerekli paketleri (`express`, `cors`, `tedious` vb.) indirecektir.
6. İşlem tamamlandıktan sonra, en üstte bulunan **"Uygulamayı yeniden başlat (Restart App)"** butonuna tıklayın.

### Kurulumun Test Edilmesi
Tarayıcıdan `http://erp.pvhvfood.com` veya `https://erp.pvhvfood.com` adresine giriş yapın. Artık Node.js API'si arka planda çalışırken, siteye girdiğinizde doğrudan PvhvErp "Giriş" ekranı (Frontend) sunulacaktır. Kullanıcı işlemleri sırasında atılan `/api/` isteklerini API karşılayacak ve veritabanı işlemlerini yürütecektir.

**Notlar ve Olası Hatalar:**
- Eğer hala `PvhvErp API is running...` veya **500 veya 502/503 hatası** alıyorsanız, Node.js veritabanına bağlanamıyor ve çöküyor demektir. Lütfen `.env` dosyasının `index.js` ile aynı klasörde olduğunu ve veritabanı giriş bilgilerinin harfi harfine doğru olduğunu kontrol edin.
- React Router nedeniyle sayfayı yenilediğinizde (F5) "Bulunamadı (404)" hatası almamak adına backend `index.js` içerisine tüm istekleri `public/index.html` dosyasına yönlendiren kod blokları projeye dâhil edilmiştir. Mimarimiz tek parça halinde eksiksiz çalışabilecek duruma getirilmiştir.
