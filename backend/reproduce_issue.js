const parseTurkishFloat = (str) => {
    if (!str) return 0;
    let clean = str.replace(/%/g, '');
    let v = clean.replace(/\./g, '');
    v = v.replace(',', '.');
    v = v.replace(/[^\d.-]/g, '');
    return parseFloat(v) || 0;
};

const testLines = [
    "1 IYM04001 RAFİNE AYÇİÇEKYAĞI 2.140 KG 83,00 TRY %1,00 1.776,20 177.620,00",
    "2 2020380 AKTÜATÖR OLIVIA 81.600,00 Adet 0.16EUR 20,00 2.611,20 13.056,00",
    "3 0052858-156 VALF ARM 4,0 1x0,32 250.880,00 Adet 0.04EUR 20,00 2.007,04 10.035,20",
    "1 SHKEDIA 52*161 AEROSOL KUTU EMAYE 52 ÇAP AEROSOL KUTU 37.104 Adet 0,1690 USD %0,00 0,00 1.254,12 6.270,58", // No stock code here actually? Or is "SHKEDIA" the brand/code?
    "   1    IYM04001   RAFİNE   2.140 KG" // Test spacing
];

// Mocking the logic inside the loop
testLines.forEach(line => {
    console.log(`\nProcessing: "${line}"`);

    const unitMatch = line.match(/\b(KG|K\.G|ADET|AD|LİTRE|LITRE|LT|M3|M2|MT|GR|GRAM)\b/i);
    let stockCode = '';

    if (unitMatch) {
        const unit = unitMatch[0];
        console.log(`Unit found: ${unit}`);
        const unitIndex = line.indexOf(unit);

        const preUnitLine = line.substring(0, unitIndex).trim();
        // Match last number as quantity
        const preNumbers = preUnitLine.match(/([\d.,]+)$/);

        if (preNumbers) {
            const quantityStr = preNumbers[1];
            console.log(`Qty Str: ${quantityStr}`);

            let fullDesc = preUnitLine.substring(0, preUnitLine.lastIndexOf(quantityStr)).trim();
            console.log(`Raw Desc: "${fullDesc}"`);

            // Cleanup Leading Row No
            const rowNoMatch = fullDesc.match(/^(\d{1,3})\s+(.*)$/);
            if (rowNoMatch) {
                fullDesc = rowNoMatch[2];
                console.log(`After Row Clean (Spaced): "${fullDesc}"`);
            } else {
                const mergedMatch = fullDesc.match(/^(\d{1,3})([A-Z0-9].*)$/);
                if (mergedMatch) {
                    fullDesc = mergedMatch[2];
                    console.log(`After Row Clean (Merged): "${fullDesc}"`);
                }
            }

            // Extract Stock Code
            const parts = fullDesc.split(/\s+/);
            if (parts.length > 0) {
                const candidate = parts[0];
                let isCode = false;

                const hasDigit = /\d/.test(candidate);
                const isNumeric = /^\d+$/.test(candidate);

                console.log(`Candidate: "${candidate}", hasDigit: ${hasDigit}, isNumeric: ${isNumeric}, len: ${candidate.length}`);

                if (hasDigit && candidate.length >= 3) {
                    if (isNumeric) {
                        if (candidate.length >= 4) isCode = true;
                    } else {
                        isCode = true;
                    }
                }
                // Special case: 0052858-156 (isNumeric=false, hasDigit=true) -> OK

                if (isCode) {
                    stockCode = candidate;
                    console.log("-> Identified as Stock Code!");
                } else {
                    console.log("-> Not a Stock Code");
                }
            }
        }
    }
});
