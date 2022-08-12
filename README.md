# btPin-rotator

This simply rotates a bt-agent's pin. This is roughly done. No, I will not improve it... probably.

This is supposed to be used on linux with bt-agent from [bluez-tools](https://github.com/khvzak/bluez-tools)

You can follow .env.example on how to configure btPin-rotator. The config is as follows:

|Key|Value|Description|
|:-------|:-------:|------:|
|`TWILIO_ACCOUNT_SID`|String|This is the account SID for the use of Twilio.|
|`TWILIO_AUTH_TOKEN`|String|This is the auth token for the use of Twilio.|
|`TWILIO_FROM_PHONE`|String|The phone number to use on said Twilio account.|
|`TWILIO_TO_PHONE`|String|The phone number to send the new bluetooth pin to.|
|`PIN_PATH`|String|The full path to the pin file bluez-tools' bt-agent will use.|
|`CODE_LENGTH`|Number|The length of the new bluetooth pin. (JS Only)|
|`SERVICE`|String|The name the bt-agent service is under for restarting under new bluetooth pin.|
