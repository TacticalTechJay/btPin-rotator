const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const pinpath = process.env.PIN_PATH;
const {request} = require('undici');
const {writeFileSync, readFileSync} = require('fs');
const {getBus} = require('dbus');

const bus = getBus('system');

let tickSleep = new Date().setHours(23, 59, 59, 0) - Date.now()

let tickBomb = setTimeout(async function flame() {
    const code = randNumbs(process.env.CODE_LENGTH);
    const data = [];
    try {
        const {body,statusCode} = await request(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: "POST",
            headers: {
                "authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                "content-type": "application/x-www-form-urlencoded"
            },
            body: `To=${process.env.TWILIO_TO_PHONE}&Body=Your new piberry speaker bluetooth code: ${code}&From=${process.env.TWILIO_FROM_PHONE}`
        });

        if (statusCode === 201) {
            const pinFile = readFileSync(process.env.PIN_PATH, 'utf-8');
            const newText = pinFile.replace(/^\*\s{1,}[0-9]{4}/gm, `* ${code}`);
            writeFileSync(`${process.env.PIN_PATH}.old`, newText, {encoding: 'utf-8'});
            writeFileSync(process.env.PIN_PATH, newText, {encoding: 'utf-8'});



            // bus.getInterface('org.freedesktop.systemd1', '/org/freedesktop/systemd1', 'org.freedesktop.systemd1.Manager', (err, iface) => {
            //     if (err) {
            //         console.error(err);
            //         return;
            //     }
                
            //     iface.restartUnit('bt-agent.service', 'replace', (err, res) => {
            //         if (err) {
            //             return console.error(err);
            //         }
            //         console.log(res);
            //     })
            // })

            return tickBomb = setTimeout(flame, 86400000)
        } else {
            body.setEncoding('utf8')
            body.on('data', (ch) => data.push(ch));
            body.once('end', () => {
                const res = JSON.parse(data.join())
                throw new Error(`Code: ${res.code}\nMessage: ${res.message}\nMore Info: ${res.more_info}\nStatus: ${res.status}`)
            }).catch((e) => {throw e});
        }
    } catch (e) {throw e};
}, tickSleep)

function randNumbs(n) {
    let res = ""

    for(let x = 0; x < n; x++) {
        const num = Math.floor(Math.random() * 10)
        res = res + String(num)
    }
    return res;
}

