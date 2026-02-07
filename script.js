processLocal() {
    const box = document.getElementById('magic-box');
    let raw = box.value;
    if(!raw) return;

    // 1. Map for Bangla to English Translation
    const translationMap = {
        'নাম': 'Name', 'ঠিকানা': 'Address', 'ফোন': 'Phone',
        'ঢাকা': 'Dhaka', 'উত্তরা': 'Uttara', 'মিরপুর': 'Mirpur',
        'গাজীপুর': 'Gazipur', 'সাভার': 'Savar', 'সাভার': 'Savar',
        'বসুন্ধরা': 'Basundhara', 'বনানী': 'Banani', 'গুলশান': 'Gulshan',
        'মোবাইল': 'Mobile', 'ব্ল্যাক': 'Black', 'হোয়াইট': 'White',
        'লাল': 'Red', 'নীল': 'Blue'
    };

    const digitMap = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };

    // 2. Perform Translation
    Object.keys(translationMap).forEach(key => {
        const reg = new RegExp(key, 'g');
        raw = raw.replace(reg, translationMap[key]);
    });
    
    // Convert Bangla Digits to English
    raw = raw.replace(/[০-৯]/g, d => digitMap[d]);

    // 3. Extract Phone (11 digits starting with 01)
    const phoneMatch = raw.match(/01[3-9]\d{8}/);
    const phone = phoneMatch ? phoneMatch[0] : "";

    // 4. Split lines to find Name and Address
    const lines = raw.split('\n').filter(l => l.trim() !== "");
    let name = lines[0] ? lines[0].replace(phone, '').replace(/[:,-]/g, '').trim() : "CUSTOMER NAME";
    
    // Address is usually the rest of the text
    let address = lines.slice(1).join(', ').replace(phone, '').trim();
    if(!address) address = "No Address Detected";

    // 5. Detect SKU from Inventory
    let foundSku = "";
    Inventory.data.forEach(item => {
        if(raw.toUpperCase().includes(item.sku.toUpperCase())) foundSku = item.sku;
    });

    // 6. Inject into Active Memo
    const active = this.getActive();
    if (active) {
        active.querySelector('.m-name').value = name.toUpperCase();
        active.querySelector('.m-phone').value = phone;
        active.querySelector('.m-addr').value = address;

        // Shipping Zone Detection
        const up = raw.toUpperCase();
        if(['GAZIPUR', 'SAVAR', 'NARAYANGANJ', 'KERANIGANJ'].some(k => up.includes(k))) {
            this.setShipping(70, 'Suburban');
        } else if(['MIRPUR', 'UTTARA', 'DHAKA', 'DHANMONDI', 'GULSHAN', 'BANANI', 'MOGHBAZAR'].some(k => up.includes(k))) {
            this.setShipping(60, 'Inside Dhaka');
        } else {
            this.setShipping(120, 'Outside Dhaka');
        }

        // If SKU found, open the selector modal
        if(foundSku) {
            this.prepItem(foundSku);
        }
    }

    box.value = ""; // Clear for next use
    this.updateBatchList();
},
