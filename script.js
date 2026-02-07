const Core = {
    seq: 3700, activeIdx: 0, pending: null,
    
    init() { 
        Inventory.render(); 
        this.createNewMemo(); 
    },

    // NEW LOCAL RECOGNITION ENGINE (No API Key Needed)
    processLocalMagic() {
        const box = document.getElementById('magic-box');
        const raw = box.value;
        if(!raw.trim()) return;

        // 1. Extract Phone (Looks for 11 digit numbers starting with 01)
        const phoneMatch = raw.match(/01[3-9]\d{8}/);
        const phone = phoneMatch ? phoneMatch[0] : "";

        // 2. Extract SKU (Matches any SKU currently in your Inventory)
        let foundSku = "";
        let detectedPrice = 0;
        Inventory.data.forEach(item => {
            if (raw.toUpperCase().includes(item.sku.toUpperCase())) {
                foundSku = item.sku;
            }
        });

        // 3. Extract Name (Assumes name is in the first line or before a comma)
        const lines = raw.split('\n');
        let name = lines[0].replace(phone, '').replace(/[^\w\s]/gi, '').trim();
        if(name.length > 20) name = name.substring(0, 20); // Keep it clean

        // 4. Extract Address (Grabs everything that isn't name or phone)
        let address = raw.replace(phone, '').replace(lines[0], '').trim();
        if(!address) address = "Address not detected";

        // 5. Detect Shipping Zone (Local Keywords)
        let shipCost = 120; // Default Outside
        let shipLabel = "Outside Dhaka";
        
        const dhakaKeywords = ['MIRPUR', 'UTTARA', 'DHANMONDI', 'GULSHAN', 'BANANI', 'MOGHBAZAR', 'DHAKA', 'BASUNDHARA'];
        const suburbanKeywords = ['GAZIPUR', 'SAVAR', 'NARAYANGANJ', 'KERANIGANJ'];

        const upperRaw = raw.toUpperCase();
        if (suburbanKeywords.some(k => upperRaw.includes(k))) {
            shipCost = 70; shipLabel = "Suburban";
        } else if (dhakaKeywords.some(k => upperRaw.includes(k))) {
            shipCost = 60; shipLabel = "Inside Dhaka";
        }

        // --- INJECTION ---
        const active = this.getActive();
        active.querySelector('.m-name').value = name.toUpperCase();
        active.querySelector('.m-phone').value = phone;
        active.querySelector('.m-addr').value = address;
        
        this.setShipping(shipCost, shipLabel);

        // Auto-add product if SKU detected
        if(foundSku) {
            this.pending = Inventory.data.find(i => i.sku === foundSku);
            this.injectRow("N/A", "N/A", 1);
        }

        box.value = ""; // Clear box after success
    },

    // ... rest of your Core functions (injectRow, recalc, etc.) stay the same
};
