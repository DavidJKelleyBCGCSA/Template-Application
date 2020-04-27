/* eslint-disable */

const FORMAT_REGEXPS = {
    // latitudeLongitude: /^(\-?([0-8]?[0-9](\.\d+)?|90(.[0]+)?)\s?[,]\s?)+(\-?([1]?[0-7]?[0-9](\.\d+)?|180((.[0]+)?)))$/,
    // timeZones: /^(\b(Africa\/Abidjan|Africa\/Accra|Africa\/Addis_Ababa|Africa\/Algiers|Africa\/Asmara|Africa\/Asmera|Africa\/Bamako|Africa\/Bangui|Africa\/Banjul|Africa\/Bissau|Africa\/Blantyre|Africa\/Brazzaville|Africa\/Bujumbura|Africa\/Cairo|Africa\/Casablanca|Africa\/Ceuta|Africa\/Conakry|Africa\/Dakar|Africa\/Dar_es_Salaam|Africa\/Djibouti|Africa\/Douala|Africa\/El_Aaiun|Africa\/Freetown|Africa\/Gaborone|Africa\/Harare|Africa\/Johannesburg|Africa\/Juba|Africa\/Kampala|Africa\/Khartoum|Africa\/Kigali|Africa\/Kinshasa|Africa\/Lagos|Africa\/Libreville|Africa\/Lome|Africa\/Luanda|Africa\/Lubumbashi|Africa\/Lusaka|Africa\/Malabo|Africa\/Maputo|Africa\/Maseru|Africa\/Mbabane|Africa\/Mogadishu|Africa\/Monrovia|Africa\/Nairobi|Africa\/Ndjamena|Africa\/Niamey|Africa\/Nouakchott|Africa\/Ouagadougou|Africa\/Porto-Novo|Africa\/Sao_Tome|Africa\/Timbuktu|Africa\/Tripoli|Africa\/Tunis|Africa\/Windhoek|America\/Adak|America\/Anchorage|America\/Anguilla|America\/Antigua|America\/Araguaina|America\/Argentina\/Buenos_Aires|America\/Argentina\/Catamarca|America\/Argentina\/ComodRivadavia|America\/Argentina\/Cordoba|America\/Argentina\/Jujuy|America\/Argentina\/La_Rioja|America\/Argentina\/Mendoza|America\/Argentina\/Rio_Gallegos|America\/Argentina\/Salta|America\/Argentina\/San_Juan|America\/Argentina\/San_Luis|America\/Argentina\/Tucuman|America\/Argentina\/Ushuaia|America\/Aruba|America\/Asuncion|America\/Atikokan|America\/Atka|America\/Bahia|America\/Bahia_Banderas|America\/Barbados|America\/Belem|America\/Belize|America\/Blanc-Sablon|America\/Boa_Vista|America\/Bogota|America\/Boise|America\/Buenos_Aires|America\/Cambridge_Bay|America\/Campo_Grande|America\/Cancun|America\/Caracas|America\/Catamarca|America\/Cayenne|America\/Cayman|America\/Chicago|America\/Chihuahua|America\/Coral_Harbour|America\/Cordoba|America\/Costa_Rica|America\/Creston|America\/Cuiaba|America\/Curacao|America\/Danmarkshavn|America\/Dawson|America\/Dawson_Creek|America\/Denver|America\/Detroit|America\/Dominica|America\/Edmonton|America\/Eirunepe|America\/El_Salvador|America\/Ensenada|America\/Fort_Nelson|America\/Fort_Wayne|America\/Fortaleza|America\/Glace_Bay|America\/Godthab|America\/Goose_Bay|America\/Grand_Turk|America\/Grenada|America\/Guadeloupe|America\/Guatemala|America\/Guayaquil|America\/Guyana|America\/Halifax|America\/Havana|America\/Hermosillo|America\/Indiana\/Indianapolis|America\/Indiana\/Knox|America\/Indiana\/Marengo|America\/Indiana\/Petersburg|America\/Indiana\/Tell_City|America\/Indiana\/Vevay|America\/Indiana\/Vincennes|America\/Indiana\/Winamac|America\/Indianapolis|America\/Inuvik|America\/Iqaluit|America\/Jamaica|America\/Jujuy|America\/Juneau|America\/Kentucky\/Louisville|America\/Kentucky\/Monticello|America\/Knox_IN|America\/Kralendijk|America\/La_Paz|America\/Lima|America\/Los_Angeles|America\/Louisville|America\/Lower_Princes|America\/Maceio|America\/Managua|America\/Manaus|America\/Marigot|America\/Martinique|America\/Matamoros|America\/Mazatlan|America\/Mendoza|America\/Menominee|America\/Merida|America\/Metlakatla|America\/Mexico_City|America\/Miquelon|America\/Moncton|America\/Monterrey|America\/Montevideo|America\/Montreal|America\/Montserrat|America\/Nassau|America\/New_York|America\/Nipigon|America\/Nome|America\/Noronha|America\/North_Dakota\/Beulah|America\/North_Dakota\/Center|America\/North_Dakota\/New_Salem|America\/Ojinaga|America\/Panama|America\/Pangnirtung|America\/Paramaribo|America\/Phoenix|America\/Port-au-Prince|America\/Port_of_Spain|America\/Porto_Acre|America\/Porto_Velho|America\/Puerto_Rico|America\/Punta_Arenas|America\/Rainy_River|America\/Rankin_Inlet|America\/Recife|America\/Regina|America\/Resolute|America\/Rio_Branco|America\/Rosario|America\/Santa_Isabel|America\/Santarem|America\/Santiago|America\/Santo_Domingo|America\/Sao_Paulo|America\/Scoresbysund|America\/Shiprock|America\/Sitka|America\/St_Barthelemy|America\/St_Johns|America\/St_Kitts|America\/St_Lucia|America\/St_Thomas|America\/St_Vincent|America\/Swift_Current|America\/Tegucigalpa|America\/Thule|America\/Thunder_Bay|America\/Tijuana|America\/Toronto|America\/Tortola|America\/Vancouver|America\/Virgin|America\/Whitehorse|America\/Winnipeg|America\/Yakutat|America\/Yellowknife|Antarctica\/Casey|Antarctica\/Davis|Antarctica\/DumontDUrville|Antarctica\/Macquarie|Antarctica\/Mawson|Antarctica\/McMurdo|Antarctica\/Palmer|Antarctica\/Rothera|Antarctica\/South_Pole|Antarctica\/Syowa|Antarctica\/Troll|Antarctica\/Vostok|Arctic\/Longyearbyen|Asia\/Aden|Asia\/Almaty|Asia\/Amman|Asia\/Anadyr|Asia\/Aqtau|Asia\/Aqtobe|Asia\/Ashgabat|Asia\/Ashkhabad|Asia\/Atyrau|Asia\/Baghdad|Asia\/Bahrain|Asia\/Baku|Asia\/Bangkok|Asia\/Barnaul|Asia\/Beirut|Asia\/Bishkek|Asia\/Brunei|Asia\/Calcutta|Asia\/Chita|Asia\/Choibalsan|Asia\/Chongqing|Asia\/Chungking|Asia\/Colombo|Asia\/Dacca|Asia\/Damascus|Asia\/Dhaka|Asia\/Dili|Asia\/Dubai|Asia\/Dushanbe|Asia\/Famagusta|Asia\/Gaza|Asia\/Harbin|Asia\/Hebron|Asia\/Ho_Chi_Minh|Asia\/Hong_Kong|Asia\/Hovd|Asia\/Irkutsk|Asia\/Istanbul|Asia\/Jakarta|Asia\/Jayapura|Asia\/Jerusalem|Asia\/Kabul|Asia\/Kamchatka|Asia\/Karachi|Asia\/Kashgar|Asia\/Kathmandu|Asia\/Katmandu|Asia\/Khandyga|Asia\/Kolkata|Asia\/Krasnoyarsk|Asia\/Kuala_Lumpur|Asia\/Kuching|Asia\/Kuwait|Asia\/Macao|Asia\/Macau|Asia\/Magadan|Asia\/Makassar|Asia\/Manila|Asia\/Muscat|Asia\/Nicosia|Asia\/Novokuznetsk|Asia\/Novosibirsk|Asia\/Omsk|Asia\/Oral|Asia\/Phnom_Penh|Asia\/Pontianak|Asia\/Pyongyang|Asia\/Qatar|Asia\/Qostanay|Asia\/Qyzylorda|Asia\/Rangoon|Asia\/Riyadh|Asia\/Saigon|Asia\/Sakhalin|Asia\/Samarkand|Asia\/Seoul|Asia\/Shanghai|Asia\/Singapore|Asia\/Srednekolymsk|Asia\/Taipei|Asia\/Tashkent|Asia\/Tbilisi|Asia\/Tehran|Asia\/Tel_Aviv|Asia\/Thimbu|Asia\/Thimphu|Asia\/Tokyo|Asia\/Tomsk|Asia\/Ujung_Pandang|Asia\/Ulaanbaatar|Asia\/Ulan_Bator|Asia\/Urumqi|Asia\/Ust-Nera|Asia\/Vientiane|Asia\/Vladivostok|Asia\/Yakutsk|Asia\/Yangon|Asia\/Yekaterinburg|Asia\/Yerevan|Atlantic\/Azores|Atlantic\/Bermuda|Atlantic\/Canary|Atlantic\/Cape_Verde|Atlantic\/Faeroe|Atlantic\/Faroe|Atlantic\/Jan_Mayen|Atlantic\/Madeira|Atlantic\/Reykjavik|Atlantic\/South_Georgia|Atlantic\/St_Helena|Atlantic\/Stanley|Australia\/ACT|Australia\/Adelaide|Australia\/Brisbane|Australia\/Broken_Hill|Australia\/Canberra|Australia\/Currie|Australia\/Darwin|Australia\/Eucla|Australia\/Hobart|Australia\/LHI|Australia\/Lindeman|Australia\/Lord_Howe|Australia\/Melbourne|Australia\/NSW|Australia\/North|Australia\/Perth|Australia\/Queensland|Australia\/South|Australia\/Sydney|Australia\/Tasmania|Australia\/Victoria|Australia\/West|Australia\/Yancowinna|Brazil\/Acre|Brazil\/DeNoronha|Brazil\/East|Brazil\/West|CET|CST6CDT|Canada\/Atlantic|Canada\/Central|Canada\/Eastern|Canada\/Mountain|Canada\/Newfoundland|Canada\/Pacific|Canada\/Saskatchewan|Canada\/Yukon|Chile\/Continental|Chile\/EasterIsland|Cuba|EET|EST|EST5EDT|Egypt|Eire|Etc\/GMT|Etc\/GMT+0|Etc\/GMT+1|Etc\/GMT+10|Etc\/GMT+11|Etc\/GMT+12|Etc\/GMT+2|Etc\/GMT+3|Etc\/GMT+4|Etc\/GMT+5|Etc\/GMT+6|Etc\/GMT+7|Etc\/GMT+8|Etc\/GMT+9|Etc\/GMT-0|Etc\/GMT-1|Etc\/GMT-10|Etc\/GMT-11|Etc\/GMT-12|Etc\/GMT-13|Etc\/GMT-14|Etc\/GMT-2|Etc\/GMT-3|Etc\/GMT-4|Etc\/GMT-5|Etc\/GMT-6|Etc\/GMT-7|Etc\/GMT-8|Etc\/GMT-9|Etc\/GMT0|Etc\/Greenwich|Etc\/UCT|Etc\/UTC|Etc\/Universal|Etc\/Zulu|Europe\/Amsterdam|Europe\/Andorra|Europe\/Astrakhan|Europe\/Athens|Europe\/Belfast|Europe\/Belgrade|Europe\/Berlin|Europe\/Bratislava|Europe\/Brussels|Europe\/Bucharest|Europe\/Budapest|Europe\/Busingen|Europe\/Chisinau|Europe\/Copenhagen|Europe\/Dublin|Europe\/Gibraltar|Europe\/Guernsey|Europe\/Helsinki|Europe\/Isle_of_Man|Europe\/Istanbul|Europe\/Jersey|Europe\/Kaliningrad|Europe\/Kiev|Europe\/Kirov|Europe\/Lisbon|Europe\/Ljubljana|Europe\/London|Europe\/Luxembourg|Europe\/Madrid|Europe\/Malta|Europe\/Mariehamn|Europe\/Minsk|Europe\/Monaco|Europe\/Moscow|Europe\/Nicosia|Europe\/Oslo|Europe\/Paris|Europe\/Podgorica|Europe\/Prague|Europe\/Riga|Europe\/Rome|Europe\/Samara|Europe\/San_Marino|Europe\/Sarajevo|Europe\/Saratov|Europe\/Simferopol|Europe\/Skopje|Europe\/Sofia|Europe\/Stockholm|Europe\/Tallinn|Europe\/Tirane|Europe\/Tiraspol|Europe\/Ulyanovsk|Europe\/Uzhgorod|Europe\/Vaduz|Europe\/Vatican|Europe\/Vienna|Europe\/Vilnius|Europe\/Volgograd|Europe\/Warsaw|Europe\/Zagreb|Europe\/Zaporozhye|Europe\/Zurich|GB|GB-Eire|GMT|GMT+0|GMT-0|GMT0|Greenwich|HST|Hongkong|Iceland|Indian\/Antananarivo|Indian\/Chagos|Indian\/Christmas|Indian\/Cocos|Indian\/Comoro|Indian\/Kerguelen|Indian\/Mahe|Indian\/Maldives|Indian\/Mauritius|Indian\/Mayotte|Indian\/Reunion|Iran|Israel|Jamaica|Japan|Kwajalein|Libya|MET|MST|MST7MDT|Mexico\/BajaNorte|Mexico\/BajaSur|Mexico\/General|NZ|NZ-CHAT|Navajo|PRC|PST8PDT|Pacific\/Apia|Pacific\/Auckland|Pacific\/Bougainville|Pacific\/Chatham|Pacific\/Chuuk|Pacific\/Easter|Pacific\/Efate|Pacific\/Enderbury|Pacific\/Fakaofo|Pacific\/Fiji|Pacific\/Funafuti|Pacific\/Galapagos|Pacific\/Gambier|Pacific\/Guadalcanal|Pacific\/Guam|Pacific\/Honolulu|Pacific\/Johnston|Pacific\/Kiritimati|Pacific\/Kosrae|Pacific\/Kwajalein|Pacific\/Majuro|Pacific\/Marquesas|Pacific\/Midway|Pacific\/Nauru|Pacific\/Niue|Pacific\/Norfolk|Pacific\/Noumea|Pacific\/Pago_Pago|Pacific\/Palau|Pacific\/Pitcairn|Pacific\/Pohnpei|Pacific\/Ponape|Pacific\/Port_Moresby|Pacific\/Rarotonga|Pacific\/Saipan|Pacific\/Samoa|Pacific\/Tahiti|Pacific\/Tarawa|Pacific\/Tongatapu|Pacific\/Truk|Pacific\/Wake|Pacific\/Wallis|Pacific\/Yap|Poland|Portugal|ROC|ROK|Singapore|Turkey|UCT|US\/Alaska|US\/Aleutian|US\/Arizona|US\/Central|US\/East-Indiana|US\/Eastern|US\/Hawaii|US\/Indiana-Starke|US\/Michigan|US\/Mountain|US\/Pacific|US\/Samoa|UTC|Universal|W-SU|WET|Zulu)\b)$/,
    // continents: /^(\b(Africa|America|Asia|Atlantic|Australia|Europe|Indian|Pacific)\b)$/,
    // creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|62[0-9]{14})$/,
    // currencyCodes: /^(\b(AFN|EUR|ALL|DZD|USD|EUR|AOA|XCD|XCD|ARS|AMD|AWG|AUD|BYR|EUR|VEF|LTL|AZN|MRO|BSD|BHD|BDT|BBD|BYN|EUR|BZD|XOF|BMD|INR|BTN|BOB|BOV|USD|BAM|BWP|NOK|BRL|USD|BND|BGN|XOF|BIF|CVE|KHR|XAF|CAD|KYD|XAF|XAF|CLP|CLF|CNY|AUD|AUD|COP|COU|KMF|CDF|XAF|NZD|CRC|XOF|HRK|CUP|CUC|ANG|EUR|CZK|DKK|DJF|XCD|DOP|USD|EGP|SVC|USD|XAF|ERN|EUR|ETB|EUR|FKP|DKK|FJD|EUR|EUR|EUR|XPF|EUR|XAF|GMD|GEL|EUR|GHS|GIP|EUR|DKK|XCD|EUR|USD|GTQ|GBP|GNF|XOF|GYD|HTG|USD|AUD|EUR|HNL|HKD|HUF|ISK|INR|IDR|XDR|IRR|IQD|EUR|GBP|ILS|EUR|JMD|JPY|GBP|JOD|KZT|KES|AUD|KPW|KRW|KWD|KGS|LAK|EUR|LBP|LSL|ZAR|LRD|LYD|CHF|EUR|EUR|MOP|MKD|MGA|MWK|MYR|MVR|XOF|EUR|USD|EUR|MRU|MUR|EUR|XUA|MXN|MXV|USD|MDL|EUR|MNT|EUR|XCD|MAD|MZN|MMK|NAD|ZAR|AUD|NPR|EUR|XPF|NZD|NIO|XOF|NGN|NZD|AUD|USD|NOK|OMR|PKR|USD|PAB|USD|PGK|PYG|PEN|PHP|NZD|PLN|EUR|USD|QAR|EUR|RON|RUB|RWF|EUR|SHP|XCD|XCD|EUR|EUR|XCD|WST|EUR|STN|SAR|XOF|RSD|SCR|SLL|SGD|ANG|XSU|EUR|EUR|SBD|SOS|ZAR|SSP|EUR|LKR|SDG|SRD|NOK|SZL|SEK|CHF|CHE|CHW|SYP|TWD|TJS|TZS|THB|USD|XOF|NZD|TOP|TTD|TND|TRY|TMT|USD|AUD|UGX|UAH|AED|GBP|USD|USD|USN|UYU|UYI|UYW|UZS|VUV|VES|VND|USD|USD|XPF|MAD|YER|ZMW|ZWL|XBA|XBB|XBC|XBD|XTS|XXX|XAU|XPD|XPT|XAG)\b)$/,
    // country: /^(\b(Afghanistan|Albania|Algeria|American Samoa|Andorra|Angola|Anguilla|Antarctica|Antigua And Barbuda|Argentina|Armenia|Aruba|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bermuda|Bhutan|Bolivia|Bosnia And Herzegovina|Botswana|Bouvet Island|Brazil|British Indian Ocean Territory|Brunei Darussalam|Bulgaria|Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Cape Verde|Cayman Islands|Central African Republic|Chad|Chile|China|Christmas Island|Cocos (keeling) Islands|Colombia|Comoros|Congo|Congo|Cook Islands|Costa Rica|Cote D'ivoire|Croatia|Cuba|Cyprus|Czech Republic|Denmark|Djibouti|Dominica|Dominican Republic|East Timor|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Ethiopia|Falkland Islands (malvinas)|Faroe Islands|Fiji|Finland|France|French Guiana|French Polynesia|French Southern Territories|Gabon|Gambia|Georgia|Germany|Ghana|Gibraltar|Greece|Greenland|Grenada|Guadeloupe|Guam|Guatemala|Guinea|Guinea-bissau|Guyana|Haiti|Heard Island And Mcdonald Islands|Holy See (vatican City State)|Honduras|Hong Kong|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kazakstan|Kenya|Kiribati|Korea|Korea|Kosovo|Kuwait|Kyrgyzstan|Lao People's Democratic Republic|Latvia|Lebanon|Lesotho|Liberia|Libyan Arab Jamahiriya|Liechtenstein|Lithuania|Luxembourg|Macau|Macedonia|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Martinique|Mauritania|Mauritius|Mayotte|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montserrat|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|Netherlands Antilles|New Caledonia|New Zealand|Nicaragua|Niger|Nigeria|Niue|Norfolk Island|Northern Mariana Islands|Norway|Oman|Pakistan|Palau|Palestinian Territory|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Pitcairn|Poland|Portugal|Puerto Rico|Qatar|Reunion|Romania|Russia|Russian Federation|Rwanda|Saint Helena|Saint Kitts And Nevis|Saint Lucia|Saint Pierre And Miquelon|Saint Vincent And The Grenadines|Samoa|San Marino|Sao Tome And Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Georgia And The South Sandwich Islands|Spain|Sri Lanka|Sudan|Suriname|Svalbard And Jan Mayen|Swaziland|Sweden|Switzerland|Syria|Syrian Arab Republic|Taiwan|Tajikistan|Tanzania|Thailand|Togo|Tokelau|Tonga|Trinidad And Tobago|Tunisia|Turkey|Turkmenistan|Turks And Caicos Islands|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|United States Minor Outlying Islands|Uruguay|Uzbekistan|Vanuatu|Venezuela|Vietnam|Viet Nam|Virgin Islands|Virgin Islands|Wallis And Futuna|Western Sahara|Yemen|Zambia|Zimbabwe)\b)$/i,
    // countryCode: /^(\b(AF|AL|DZ|AS|AD|AO|AI|AQ|AG|AR|AM|AW|AU|AT|AZ|BS|BH|BD|BB|BY|BE|BZ|BJ|BM|BT|BO|BA|BW|BV|BR|IO|BN|BG|BF|BI|KH|CM|CA|CV|KY|CF|TD|CL|CN|CX|CC|CO|KM|CG|CD|CK|CR|CI|HR|CU|CY|CZ|DK|DJ|DM|DO|TP|EC|EG|SV|GQ|ER|EE|ET|FK|FO|FJ|FI|FR|GF|PF|TF|GA|GM|GE|DE|GH|GI|GR|GL|GD|GP|GU|GT|GN|GW|GY|HT|HM|VA|HN|HK|HU|IS|IN|ID|IR|IQ|IE|IL|IT|JM|JP|JO|KZ|KE|KI|KP|KR|KV|KW|KG|LA|LV|LB|LS|LR|LY|LI|LT|LU|MO|MK|MG|MW|MY|MV|ML|MT|MH|MQ|MR|MU|YT|MX|FM|MD|MC|MN|MS|ME|MA|MZ|MM|NA|NR|NP|NL|AN|NC|NZ|NI|NE|NG|NU|NF|MP|NO|OM|PK|PW|PS|PA|PG|PY|PE|PH|PN|PL|PT|PR|QA|RE|RO|RU|RW|SH|KN|LC|PM|VC|WS|SM|ST|SA|SN|RS|SC|SL|SG|SK|SI|SB|SO|ZA|GS|ES|LK|SD|SR|SJ|SZ|SE|CH|SY|TW|TJ|TZ|TH|TG|TK|TO|TT|TN|TR|TM|TC|TV|UG|UA|AE|GB|US|UM|UY|UZ|VU|VE|VN|VG|VI|WF|EH|YE|ZM|ZW)\b)$/,
    numeric: /^\-?[0-9]\d{0,}(\.\d*)?$/,
    // float: /^[+-]?([0-9]*[.])?[0-9]+$/,
    // dateTime: /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])[tT ](2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])(\.\d+)?([zZ]|[+-]([0-5][0-9]):(60|[0-5][0-9]))$/,
    // date: /^(\d{1,4}([.\-/])\d{1,2}([.\-/])\d{1,4})$/,
    // timeNonMilitary: /^[01]?\d:[0-5]\d( (am|pm))?$/i,
    // timeMilitary: /^[0-2]\d:[0-5]\d$/,
    // email: /^(?:[\w!#$%&'*+-/=?^`{|}~]+\.)*[\w!#$%&'*+-/=?^`{|}~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/,
    // ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    // ipv6: /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    // uri: /^[a-zA-Z][a-zA-Z0-9+-.]*:[^\s]*$/,
    // currency: /^\$[0-9]{1,3}(?:[0-9]*(?:[.,][0-9]{2})?|(?:,[0-9]{3})*(?:\.[0-9]{2})?|(?:\.[0-9]{3})*(?:,[0-9]{2})?)$/g,
    // phone: /^(\()?\d{3}(\))?(-|\s)?\d{3}(-|\s)\d{4}$/,
    // boolean: /^(true|false|True|False)$/,
    alphanumeric: /^(?:[0-9]+[a-z\u00C0-\u017F\s\-\_]|[a-z\u00C0-\u017F\s\-\_]+[0-9])[a-z\u00C0-\u017F0-9\s\-\_]*$/gi,
    alpha: /^[a-zA-Z\u00C0-\u017F\s\-\_]+('[a-zA-Z\u00C0-\u017F\s\-\_])?[a-zA-Z\u00C0-\u017F\s\-\_]*$/g,
};

const DATABASE_DATA_TYPES = {
    // latitudeLongitude: 'string',
    // timeZones: 'string',
    // continent: 'string',
    // creditCard: 'string',
    // currencyCodes: 'string',
    // country: 'string',
    // countryCode: 'string',
    // float: 'number',
    numeric: 'number',
    // dateTime: 'string',
    // date: 'string',
    // timeNonMilitary: 'string',
    // timeMilitary: 'string',
    // email: 'string',
    // ipAddress: 'string',
    // ipv6: 'string',
    // uri: 'string',
    // currency: 'string',
    // phone: 'string',
    // boolean: 'string',
    alpha: 'string',
    alphanumeric: 'string',
};

const isFormat = (input, format) => {
    let data = input;

    if (typeof data === 'string' || data instanceof String) {
        data = data.trim();
    }
    
    if (FORMAT_REGEXPS[format] !== undefined) {
        if (FORMAT_REGEXPS[format] instanceof RegExp) {
            const regex = FORMAT_REGEXPS[format];
            const matcher = new RegExp(regex, 'gi'); //eslint-disable-line
            const result = matcher.test(data);
            return result;
        }
    }
    return false;
};

const schemaInference = data => {
    const allFoundFormats = {};
    for (let x = 0; x < data.length; x += 1) {
        const row = data[x];
        const keys = Object.keys(row);
        for (let z = 0; z < keys.length; z += 1) {
            const key = keys[z];
            const cellData = row[key];
            const formats = Object.keys(FORMAT_REGEXPS);
            for (let y = 0; y < formats.length; y += 1) {
                const format = formats[y];
                const matchedFormat = isFormat(cellData, format);
                if (matchedFormat) {
                    let totFormat =
                        allFoundFormats[key] && allFoundFormats[key][format] ? allFoundFormats[key][format] : 0;
                    totFormat += matchedFormat ? 1 : 0;
                    allFoundFormats[key] = allFoundFormats[key] ? allFoundFormats[key] : {};
                    allFoundFormats[key][format] = allFoundFormats[key][format] ? allFoundFormats[key][format] : 0;
                    allFoundFormats[key][format] += totFormat;
                    break;
                }
            }
        }
    }

    const foundFormatColumns = Object.keys(allFoundFormats); // each colum
    const schema = [];

    for (let x = 0; x < foundFormatColumns.length; x += 1) {
        const foundFormatColumn = foundFormatColumns[x];
        const formats = Object.keys(allFoundFormats[foundFormatColumn]); // each found format
        let format = null;
        let quantity = 0;
        for (let z = 0; z < formats.length; z += 1) {
            const currentFormat = formats[z];
            const currentQuantity = allFoundFormats[foundFormatColumn][currentFormat];
            if (currentQuantity > quantity) {
                format = currentFormat;
                quantity = currentQuantity;
            }
        }
        const dataBaseType = DATABASE_DATA_TYPES[format];

        schema.push({ name: foundFormatColumn, format, type: dataBaseType });
    }

    return schema;
};


module.exports = { schemaInference, isFormat };