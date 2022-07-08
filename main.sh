#!/bin/sh

main() {
    pin=$(randNumb)

    curl -s -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json --data-urlencode "Body=Your new piberry speaker code: $pin" --data-urlencode "From=$TWILIO_FROM_PHONE" --data-urlencode "To=$TWILIO_TO_PHONE" -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN 1> /dev/null 2>&1 \
    || {
        echo $1
        echo "Error sending SMS"
        exit 1
    }

    mv $PIN_FILE $PIN_FILE.old
    sed -E "s/^\*\s{1,}[0-9]{4}/*   $pin/gm" $PIN_FILE.old > $PIN_FILE

    systemctl is-active --quiet bt-agent.service && systemctl restart bt-agent.service

    current_epoch=$(date +%s.%N)
    target_epoch=$(date -d "tomorrow 00:00:00" +%s.%N)

    sleep_seconds=$(echo "$target_epoch - $current_epoch" | awk '{print $1 - $2}')
    sleep $sleep_seconds
    main
}

randNumb() {
    echo "$((1000 + RANDOM % 9000))"
}

current_epoch=$(date +%s.%N)
target_epoch=$(date -d "tomorrow 00:00:00" +%s.%N)

sleep_seconds=$(echo "$target_epoch $current_epoch" | awk '{print $1 - $2}')
sleep $sleep_seconds
main