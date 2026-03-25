import React, { useState, useEffect } from 'react';

const DecimalInput = ({ value, onChange, className, required, placeholder, name, onBlur, disabled, style }) => {
    const [displayValue, setDisplayValue] = useState('');

    const formatValue = (val) => {
        if (!val && val !== 0) return '';

        let str = String(val);
        // Sadece rakam ve virgül kalsın (noktalar, harfler vb. temizlenir)
        let cleaned = str.replace(/[^0-9,]/g, '');

        // Sadece ilk virgülü koru
        const parts = cleaned.split(',');
        if (parts.length > 2) {
            cleaned = parts[0] + ',' + parts.slice(1).join('');
        }

        // Binlik ayıraçları (nokta) ekle
        const finalParts = cleaned.split(',');
        finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        return finalParts.join(',');
    };

    useEffect(() => {
        if (value !== undefined && value !== null && value !== '') {
            let valStr = String(value);
            // Eğer sistemden 411385.85 gibi standart float noktalı bir sayı formatı geldiyse, noktayı virgüle çevir
            if (valStr.includes('.') && !valStr.includes(',')) {
                valStr = valStr.replace('.', ',');
            }

            const formatted = formatValue(valStr);
            if (displayValue !== formatted) {
                setDisplayValue(formatted);
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e) => {
        const rawInput = e.target.value;
        const formatted = formatValue(rawInput);
        setDisplayValue(formatted);

        // Sisteme gönderilecek format: Noktalar (binlik) yok, Virgül (ondalık) nokta (.) yapılmış
        const systemValue = formatted.replace(/\./g, '').replace(',', '.');

        if (onChange) {
            onChange({
                target: {
                    name: name,
                    value: systemValue
                }
            });
        }
    };

    const handleBlur = (e) => {
        let finalValue = displayValue;
        if (finalValue.endsWith(',')) {
            finalValue = finalValue.slice(0, -1);
            setDisplayValue(finalValue);

            if (onChange) {
                onChange({
                    target: {
                        name: name,
                        value: finalValue.replace(/\./g, '').replace(',', '.')
                    }
                });
            }
        }
        if (onBlur) onBlur(e);
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            name={name}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={className}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            style={style}
        />
    );
};

export default DecimalInput;