#!/bin/sh

main() {
    pin=$(randNumb)

    local IS_ERROR=$(curl -s -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json --data-urlencode "Body=For device: $HOST\nYour daily bluetooth device pin: $pin" --data-urlencode "From=$TWILIO_FROM_PHONE" --data-urlencode "To=$TWILIO_TO_PHONE" -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN 2>&1| jq .code)
    if [ "$IS_ERROR" != "null" ]; then
        if [ -z "$IS_ERROR" ]; then
            echo "ERROR: Something went wrong with SMS. Exiting."
            exit 1
        fi
        echo "ERROR: $IS_ERROR"
        exit 1
    fi

    mv $PIN_PATH $PIN_PATH.old
    sed -E "s/^\*\s{1,}[0-9]{4}/*   $pin/gm" $PIN_FILE.old > $PIN_FILE

    systemctl is-active --quiet bt-agent.service

    if [ $? -eq 3]; then
        echo "WARNING: bt-agent service is not running. Starting it."
        systemctl start bt-agent.service
    elif [ $? -eq 130 ]; then
        systemctl restart bt-agent.service
    fi

    current_epoch=$(date +%s.%N)
    target_epoch=$(date -d "tomorrow 00:00:00" +%s.%N)

    local sleep_seconds=$(echo "$target_epoch $current_epoch" | awk '{print $1 - $2}')
    sleep $sleep_seconds
    main
}

randNumb() {
    echo "$((1000 + RANDOM % 9000))"
}

if [ ! -e $PIN_PATH ]; then
    echo "INFO: No pin file exists, creating."
    if echo "* $(randNumb)" >> $PIN_PATH
    then echo "INFO: Pin file created."
    else echo "ERROR: No directory for pin file to be created."
        exit 1
    fi
fi

current_epoch=$(date +%s.%N)
target_epoch=$(date -d "tomorrow 00:00:00" +%s.%N)

sleep_seconds=$(echo "$target_epoch $current_epoch" | awk '{print $1 - $2}')
sleep $sleep_seconds
main