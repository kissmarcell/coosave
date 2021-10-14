// ==UserScript==
// @name         CooSave
// @namespace    https://kmarcell.com
// @version      1.0
// @description  PDF másolatot készít a kitöltött tesztjeidről
// @author       contact@kmarcell.com
// @match        https://www.coosp.etr.u-szeged.hu/*FillTest*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js
// @require      https://cdn.jsdelivr.net/npm/pdfkit@0.12.3/js/pdfkit.standalone.min.js
// @require      https://github.com/devongovett/blob-stream/releases/download/v0.1.3/blob-stream.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Verziószám
    const version = "1.0";

    // Mentés gomb elrejtése
    // Alapértelmezett érték létrehozása, hogy később beállítható legyen
    if (GM_getValue("hidden") === undefined) {
        GM_setValue("hidden", 0);
    }

    // A profilkép mellett található sor, ahol a teszt oldalai között lehet válogatni 
    var oldalValaszto = document.querySelector("#pager_pages > div.wrapper > div");

    // A teszt oldalainak száma
    var oldalakszama = oldalValaszto.childElementCount - 1;

    // A teszt kérdéseit és a képeket tartalmazó tömb
    var kerdesek = [];

    // Az éppen nyitott oldal sorszámát adja vissza
    function jelenlegiOldal() {
        return parseInt(document.getElementsByClassName("page current")[0].innerText) - 1;
    }

    // Az éppen nyitott oldal kérdéseit betölti a kerdesek tömbbe
    async function oldalKerdesei() {
        var i = 0;
        for (const kerdes of document.getElementsByClassName("quiz_question")) {

            // Üres belső tömb létrehozása
            if ((kerdesek[jelenlegiOldal()]) == undefined) kerdesek[jelenlegiOldal()] = [];

            // Kérdés szövegének és képének mentése
            kerdesek[jelenlegiOldal()][i] = [
                kerdes.children[0].innerText,
                await html2canvas(document.getElementsByClassName("boxcontent")[i])
            ];

            i++;

        }
    };

    // Onclick függvények hozzáadása a megfelelő gombokhoz és a kérdéstömb frissítése
    function update() {
        $(".page").not(".current").unbind("click");
        $(".options").unbind("click");
        setTimeout(
            function() {
                // TODO: ha gyorsan kattint, többször kerül rögzítésre
                // A felső oldalválasztó sor gombjaira való kattintásakor lefut az update parancs
                $(".page").not(".current").bind({ click: update });
                // A jobbra és balra léptető gombokra való kattintáskor lefut az update parancs
                $(".options").bind({ click: update });
                // Az adott lap kérdései betöltődnek
                oldalKerdesei();
                // A letöltés gomb megjelenítése, ha engedélyezve van
                if (GM_getValue("hidden") === 0) document.querySelector("#page_buttons_top").appendChild(downloadButton);
                console.log("Frissítve!");
            }, 200)
    }

    // PDF készítése blob-ból
    // https://stackoverflow.com/questions/52817280/problem-downloading-a-pdf-blob-in-javascript
    function downloadFile(blob, fileName) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 7000);
    };

    // Ha minden kérdés mentésre került, PDF generálása
    function gen() {
        // PDF dokumentum létrehozása
        const doc = new PDFDocument();
        const stream = doc.pipe(blobStream());

        var i = 0;
        // PDF dokumentum feltöltése a kérdésekkel
        for (const oldal of kerdesek) {
            for (const kerdes of oldal) {
                doc.text(kerdes[0]);
                doc.image(kerdes[1].toDataURL("image/png"), { scale: 0.50 });
                i++;
            }
        }

        // Footer hozzáadása
        // TODO: néha hibát dob, bár a megjelenésben problémát nem okoz
        doc.fontSize(8);
        // A margó átmeneti törlése, enélkül a pdfkit nem enged a margó helyére írni
        let bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        // Footer hozzáfűzése a dokumentumhoz
        doc.text("CooSave " + version,
            0.5 * (doc.page.width - 100), doc.page.height - 40, {
                link: "https://github.com/kissmarcell/coosave",
                width: 100,
                align: 'center',
                lineBreak: false
            }
        );
        // TODO: Kurzor visszaállítása az eredeti pozícióba - lehet nem is szükséges
        doc.text('', 50, 50);
        // Margó visszaállítása
        doc.page.margins.bottom = bottom;
        doc.fontSize(12);

        doc.end();
        // Dokumentum letöltésének felajánlása
        stream.on('finish', function() {
            downloadFile(stream.toBlob(), "result.pdf");
        })
    };

    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'S') {
            gen();
            console.log("Sikeres mentés!");
        }
    });

    // Mentés gomb ki- és bekapcsolása a Ctrl + Shift + k billentyűkombinációval
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'K') {
            if (GM_getValue("hidden") === 0) {
                GM_setValue("hidden", 1);
                alert("A letöltés gomb sikeresen letiltva, töltsd újra az oldalt, hogy eltűnjön!");
            } else if (GM_getValue("hidden") === 1) {
                GM_setValue("hidden", 0);
                alert("A letöltés gomb sikeresen engedélyezve, töltsd újra az oldalt, hogy megjelenjen!");
            }
        }
    });

    // Gomb megjelenítése, ha a rejtettség ki van kapcsolva
    if (GM_getValue("hidden") == 0) {
        // Gomb létrehozása
        var downloadButton = document.createElement("a");
        downloadButton.classList = ["options, linkbutton24"];
        downloadButton.id = "download";
        downloadButton.oncontextmenu = function() { return false; }
        downloadButton.style = "padding-left: 29px; background-image: url(/$Theme-edu3$/Content/Theme/new/ControlButtons/mentes.png); line-height: 24px;";
        downloadButton.innerText = "Letöltés";
        downloadButton.addEventListener("click", function() {
            gen();
        });

        // Első frissítés
        update();
    }

})();