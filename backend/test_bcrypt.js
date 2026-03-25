const bcrypt = require('bcryptjs');

const hashes = [
    { u: 'admin', p: '$2a$10$iQcj.hzDyQCfev/C/fABDeQsfedzkbHoMXEZse8pAk0yzM4kiF6kC' },
    { u: 'Bulent', p: '$2a$10$7.I5ySGqPToRO8zRmCoBM.wT4JzZ/Y1gb/gZsqnmpQDb.ZFvIdRSu' },
    { u: 'Serol', p: '$2a$10$C.y2ekEGyf8HzfHoJROkQuavK1Yf9YWZYrolXwEQWg2EHEhkrM6pe' }
];

async function check() {
    const commonPasswords = ['123456', '12345678', 'password', 'Bulent123', 'Serol123', 'admin', 'admin123', '123'];
    for (let h of hashes) {
        let found = false;
        for (let cp of commonPasswords) {
            if (await bcrypt.compare(cp, h.p)) {
                console.log(`User ${h.u} password is: ${cp}`);
                found = true;
                break;
            }
        }
        if (!found) console.log(`User ${h.u} password not found in common list`);
    }
}
check();
