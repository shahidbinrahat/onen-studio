const API_KEY = "AIzaSyCjyGQUkRMWSHUJZbEi-kLbsFqei2-o6Aw";

const Core = {
    seq: 3000, activeIdx: 0,
    
    init() { 
        Inventory.render(); 
        this.createNewMemo(); 
    },

    createNewMemo() {
        const tpl = document.getElementById('memo-tpl').content.cloneNode(true);
        const card = tpl.querySelector('.memo-card');
        card.querySelector('.m-id').innerText = '#' + this.seq++;
        card.querySelector('.m-date').innerText = new Date().toLocaleDateString();
        
        document.getElementById('pdf-container').prepend(card);
        this.selectMemo(card);
    },

    selectMemo(el) {
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active', 'border-amber-500'));
        el.classList.add('active', 'border-amber-500');
        this.activeIdx = Array.from(document.querySelectorAll('.memo-card')).indexOf(el);
    },

    getActive() {
        return document.querySelectorAll('.memo-card')[this.activeIdx];
    },

    async askGemini() {
        const btn = document.getElementById('ai-btn');
        btn.innerText = "Processing...";
        const rawText = document.getElementById('magic-box').value;
        
        const promptText = `Extract from: "${rawText}". Return JSON: {"name":"","phone":"","address":"","sku":"","color":"","size":"","qty":1,"ship":60}`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await resp.json();
            const res = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, ""));
            
            const active = this.getActive();
            active.querySelector('.m-name').value = res.name;
            active.querySelector('.m-phone').value = res.phone;
            active.querySelector('.m-addr').value = res.address;
            this.setShipping(res.ship, res.ship == 60 ? "Dhaka" : "Outside");
        } catch (e) { alert("AI could not parse text."); }
        btn.innerText = "Process with AI";
    },

    setShipping(val, label) {
        const active = this.getActive();
        active.querySelector('.m-s').innerText = val;
        active.querySelector('.m-tag').innerText = label;
        this.recalc();
    },

    recalc() {
        const active = this.getActive();
        let total = 0;
        // Totaling logic here...
    },

    exportPDF() {
        const element = document.getElementById('pdf-container');
        html2pdf().from(element).set({
            margin: 10, filename: 'ONEN-BATCH.pdf', 
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    }
};

const Inventory = {
    data: JSON.parse(localStorage.getItem('ONEN_INV')) || [],
    render() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = this.data.map(p => `
            <div class="bg-white border p-2 rounded cursor-pointer hover:bg-slate-50 text-[11px] font-bold" onclick="Core.prepItem('${p.sku}')">
                ${p.name} <span class="text-amber-500 font-mono">[${p.sku}]</span>
            </div>
        `).join('');
    }
};

window.onload = () => Core.init();
