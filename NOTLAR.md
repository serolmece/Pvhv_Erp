# Proje Güncelleme Notları - 25 Mart 2026

Bu güncelleme kapsamında yapılan değişiklikler aşağıda listelenmiştir:

### 1. Global Veri Yenileme (Refresh) Mekanizması
*   Tüm sayfayı baştan yükleyen (F5/Reload) eski yapı yerine, SPA (Single Page Application) mimarisine uygun, merkezi bir verileri yenileme sistemi kuruldu.
*   Üst menüdeki "Verileri Yenile" butonu artık sadece ödemeleri değil; kategoriler, ürünler ve stok hareketleri gibi tüm veritabanı tablolarını anlık olarak güncelliyor.
*   Butona basıldığında işlemin gerçekleştiğine dair görsel geri bildirim sağlayan spin animasyonu (`animate-spin-once`) eklendi.

### 2. Dashboard (Panel) Geliştirmeleri
*   Kullanıcının tüm sistemin yenilendiğini görebilmesi için Dashboard'a **Kategoriler** ve **Stok Hareketleri** özet kartları eklendi.
*   Paneldeki tüm veri setleri (Grafikler, Kritik Stoklar, Bugünün Ödemeleri) yenileme tetikleyicisine bağlandı.

### 3. Sayfa Bazlı Entegrasyonlar
*   Uygulamanın ana sayfaları (`Products.jsx`, `StockCategories.jsx`, `StockMovements.jsx`, `Payments.jsx`, `Customers.jsx`, `OrdersList.jsx`) React Router Context (Outlet) üzerinden yenileme sinyalini dinleyecek şekilde güncellendi.
*   Bu sayfalarda kullanıcı deneyimi kesintiye uğramadan (loading state ile) veri tazeleme yapılması sağlandı.

---
*Bu notlar 25.03.2026 tarihinde Antigravity tarafından oluşturulmuştur.*

---

# Eski Güncelleme Notları - 16 Mart 2026

Bu güncelleme kapsamında yapılan değişiklikler aşağıda listelenmiştir:

### 1. Giriş Sayfası Revizyonu
*   Giriş ekranı tasarımı tamamen yenilendi. Monochrome (Siyah-Beyaz-Gri) tonlarda, modern ve temiz bir görünüm kazandırıldı.
*   Arka plan rengi uyumlu tonlarla güncellenerek giriş penceresinin öne çıkması sağlandı.
*   Renk paleti kullanıcı isteği doğrultusunda [izmirymmo.org.tr](https://sozlesme.izmirymmo.org.tr/raporlama) projesiyle uyumlu hale getirildi.

### 2. Kullanıcı Yönetimi ve Sunucu Uyumluluğu
*   Plesk/IIS sunucularda yaşanan "Bir hata oluştu" uyarısını önlemek için backend hata kodları (500 -> 400) ve hata yakalama mekanizmaları optimize edildi.
*   Kullanıcı oluşturma, şifre değiştirme ve silme işlemlerindeki stabilite sorunları giderildi.
*   Sunucuya özel `web.config.production` dosyası oluşturuldu ve dağıtım paketine otomatik dâhil edildi.

### 3. Oturum ve Veri Sürekliliği
*   JWT (oturum) süresi 1 saatten 24 saate çıkarılarak, gün boyu kesintisiz çalışma sağlandı.
*   Sistemde inaktivite sonrası verilerin kaybolması sorunu, merkezi API (Axios Interceptor) yapısına geçilerek ve oturum süresi uzatılarak kalıcı olarak çözüldü.

### 4. Stok Raporları Aktivasyonu
*   Raporlar menüsü aktif hale getirildi; "Toplam Envanter Değeri" ve "Toplam Ürün Çeşidi" istatistikleri eklendi.
*   `vw_StokRaporu` veritabanı görünümü oluşturularak stok verilerinin (Giriş, Çıkış, Mevcut, Ortalama Fiyat, Toplam Değer) doğru hesaplanması sağlandı.

### 5. Döviz ve Finans Entegrasyonu
*   **Canlı Kur Paneli:** Dashboard (Panel) ekranının üst kısmına USD, EUR kurlarını ve EUR/USD paritesini anlık gösteren bölüm eklendi.
*   **Çoklu Para Birimli Envanter:** Stok kartlarında USD veya EUR olarak tanımlanan ürünlerin değerleri, canlı kurlar üzerinden otomatik olarak TL'ye çevrilerek toplam envanter değerine yansıtıldı.

### 6. Kullanıcı Deneyimi (UX) İyileştirmeleri
*   **Hızlı Cari Arama:** Ödeme ekleme ekranında Cari Seçimi listesine klavyeden yazarak arama özelliği (şirket/müşteri ismiyle hızlı bulma) eklendi.
*   Türkçe karakter duyarlı filtreleme altyapısı kuruldu.

### 7. Dağıtım ve Servis
*   Tüm değişiklikleri içeren `PvhvErp_Guncelleme.zip` otomatik paketleme sistemi (create_update.js) güncellendi.
*   `setup_reports.js` scripti ile sunucuda raporlama altyapısının tek komutla kurulabilmesi sağlandı.

---
*Bu notlar 16.03.2026 tarihinde Antigravity tarafından oluşturulmuştur.*
