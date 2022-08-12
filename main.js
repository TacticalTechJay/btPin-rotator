const ops = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    pinpath: process.env.PIN_PATH,
    service: process.env.SERVICE,
    codeLength: process.env.CODE_LENGTH,
}
const {request} = require('undici');
const {writeFileSync, readFileSync} = require('fs');
const { hostname } = require('os');
const dbus = require('dbus');

const bus = dbus.getBus('system');

let tillMidnight = new Date().setHours(23, 59, 59, 999) - Date.now();

async function main() {
    tillMidnight = new Date().setHours(23, 59, 59, 999) - Date.now();

    const code = randNumbs(ops.codeLength);
    try {
        const pinFile = readFileSync(ops.pinpath, 'utf8');

        if (pinFile.length === 0) {
            console.warn("Warning: Pin file is empty. Creating new pin...")
            await sendSMS('new', code);
            return setTimeout(main, tillMidnight);
        } else if (!/^\*\s{1,}[0-9]{4}/gm.test(pinFile)) {
            console.warn('Warning: Current pin was not found. Creating new pin...')
            await sendSMS('notfound', code, pinFile);
            return setTimeout(main, tillMidnight);
        }

        await sendSMS('replace', code, pinFile);
        return setTimeout(main, tillMidnight)
    } catch(e) {
        if (e.code === 'ENOENT') {
            console.warn('Warning: Pin file not found, creating one');
            try {
                await sendSMS('new', code);
                return setTimeout(main, tillMidnight);                
            } catch (e) {throw e}
        }
        throw e;
    }
}

function randNumbs(n) {
    let res = ""

    for(let x = 0; x < n; x++) {
        const num = Math.floor(Math.random() * 10)
        res = res + String(num)
    }
    return res;
}

async function sendSMS(type, code, pinFile) {
    let msg;
    let data = [];
    switch(type) {
        case 'new':
            msg = `There is now a bluetooth pin for this bluetooth device: ${hostname()}\nYour bluetooth pin is: ${code}`;
            writeFileSync(ops.pinpath, `*    ${code}`);
            break;
        case 'replace':
            msg = `Your bluetooth pin has been changed to: ${code}\nIt is for this device: ${hostname()}`;
            const newText = pinFile.replace(/^\*\s{1,}[0-9]{4}/gm, `*    ${code}`);
            writeFileSync(`${ops.pinpath}.old`, newText, {encoding: 'utf-8'});
            writeFileSync(ops.pinpath, newText, {encoding: 'utf-8'});
            break;
        case 'notfound':
            msg = `There is now a bluetooth pin for this bluetooth device: ${hostname()}\nYour bluetooth pin is: ${code}`;
            writeFileSync(ops.pinpath, `\n*    ${code}`, {flag: 'as'});
            break;
    }
    try {
        const {body,statusCode} = await request(`https://api.twilio.com/2010-04-01/Accounts/${ops.accountSid}/Messages.json`, {
            method: "POST",
            headers: {
                "authorization": `Basic ${Buffer.from(`${ops.accountSid}:${ops.authToken}`).toString('base64')}`,
                "content-type": "application/x-www-form-urlencoded"
            },
            body: `To=${process.env.TWILIO_TO_PHONE}&Body=${msg}&From=${process.env.TWILIO_FROM_PHONE}`
        });

        if (statusCode !== 201) {
            body.setEncoding('utf8')
            body.on('data', (ch) => data.push(ch));
            body.once('end', () => {
                const res = JSON.parse(data.join())
                throw new Error(`Code: ${res.code}\nMessage: ${res.message}\nMore Info: ${res.more_info}\nStatus: ${res.status}`)
            }).catch((e) => {throw e});
        }

        bus.getInterface('org.freedesktop.systemd1', '/org/freedesktop/systemd1', 'org.freedesktop.systemd1.Manager', (err, iface) => {
            if (err) throw err;
            
            iface.GetUnit(`${ops.service}.service`, (err, res) => {
                if (err) throw err;

                if (res.ActiveState === 'inactive') {
                    console.info('Info: Service is not active, restarting.')
                    res.methods.Start(`${ops.service}.service`, 'replace', (err, res) => {
                        if (err) throw err;
                        console.log(res);
                        return;
                    })
                } else if (res.ActiveState == 'active') {
                    res.methods.Restart(`${ops.service}.service`, 'replace', (err, res) => {
                        if (err) throw err;
                        return;
                    })
                } else throw new Error(`Service is in neither an active or inactive state: ${res.ActiveState}`)
            })
        })
    } catch(e) {
        console.error(`Error: Something went wrong, reverting pin. Error message below:\n${e}`);
        writeFileSync(ops.pinpath, pinFile, {encoding: 'utf-8'});
    }
}

Object.keys(ops).forEach((key) => {
    if (!ops[key]) throw new Error(`${key} is not defined`)
})

setTimeout(main, tillMidnight);
console.log(`Info: Ready!`)