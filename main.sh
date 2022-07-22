#!/bin/sh

main() {
    pin=$(randNumb)

    local IS_ERROR=$(curl -s -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json --data-urlencode "Body=For device: $HOST\nYour daily bluetooth device pin: $pin" --data-urlencode "From=$TWILIO_FROM_PHONE" --data-urlencode "To=$TWILIO_TO_PHONE" -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN 2>&1| jq .code)
    if [ "$IS_ERROR" != "null" ]; then
        if [ -z "$IS_ERROR" ]; then
            echo -e "\e[31mERROR: Something went wrong with SMS. Exiting.\e[0m"
            exit 1
        fi
        echo "ERROR: $IS_ERROR"
        exit 1
    fi

    mv $PIN_PATH $PIN_PATH.old
    sed -E "s/^\*\s{1,}[0-9]{4}/*   $pin/gm" $PIN_FILE.old > $PIN_FILE

    systemctl is-active --quiet $SERVICE.service

    if [ $? -eq 3]; then
        echo -e "\e[1;33mWARNING: bt-agent service is not running. Starting it.\e[0m"
        systemctl start $SERVICE.service
    elif [ $? -eq 130 ]; then
        systemctl restart $SERVICE.service
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

service_exists() {
    local n=$1
    if [ $(systemctl list-units --all -t service --full --no-legend "$n.service" | sed 's/^\s*//g' | cut -f1 -d' ') == $n.service ]; then
        return 0
    else
        return 1
    fi
}

if [ ! -e $PIN_PATH ]; then
    echo -e "\e[1;37mINFO: No pin file exists, creating.\e[0m"
    if echo "* $(randNumb)" >> $PIN_PATH
    then echo -e "\e[1;37mINFO: Pin file created.\e[0m"
    else echo -e "\e[31mERROR: No directory for pin file to be created.\e[0m"
        exit 1
    fi
fi

if [ service_exists $SERVICE ] ; then
    echo -e "\e[1;37mINFO: $SERVICE service found.\e[0m"
else
    echo -e "\e[31mERROR: $SERVICE service does not exist. Exiting.\e[0m"
    exit 1
fi

current_epoch=$(date +%s.%N)
target_epoch=$(date -d "tomorrow 00:00:00" +%s.%N)

sleep_seconds=$(echo "$target_epoch $current_epoch" | awk '{print $1 - $2}')
sleep $sleep_seconds
main