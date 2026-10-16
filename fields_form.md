Все icon это компонент ImageField с "iconMode: true"
Опции поля (данные опции (возможно частично), в дальнейшем будут использоваться и для других полей):
1) "Label" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле (textarea) + Prefix Icon и Suffix Icon
2) "Required" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле (только если выбрано "Custom Error Message") + Prefix Icon и Suffix Icon
- checkbox "Show Asterisk Symbol"
- Asterisk Position (если выбрано "Show Asterisk Symbol") - left, before, after, right
3) "Subtitle" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле (textarea) + Prefix Icon и Suffix Icon
4) текстовое поле "Placeholder"
5) текстовое поле "Default value"
6) Input Icons:
- Prefix Icon
- Suffix Icon
7) "Helper Text" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле (textarea) + Prefix Icon и Suffix Icon
8) Min/Max Text Length: (все поля number)
- Min Length
- Max Length
- Min Word
- Max Word
9) Suggestion - репитер текстовых полей (Label, Value), так же нужен handle
10) select "Auto Complete":
- Off
- On
  Name:
- Name
- honorific-prefix
- Give name
- Additional name
- Family name
- Honorific suffix
- Nickname
- Email
- Username
- New password
- Current password
- One time code
- Organization title
- Organization
- Street address
- Address line 1
- Country
- Country name
- Postal code
- Cc name
- Cc given name
- Cc additional name
- Cc family name
- Cc number
- Cc exp
- Cc exp month
- Cc exp yeat
- Cc cse
- Cca type
- Transaction currency
- Transaction account
- Language
  Birth Date:
- Birth day
- Bday day
- Bday month
- Bday Year
- Sex
  Telephone:
- Telephone
- Tel national
- Tel Counrty code
- Tel Area code
- Tel local
- Tel extension
- Impp
- URL
- Photo
11) select "Input mode":
- none
- text
- decimal
- numeric
- tel
- search
- email
- url
12) текстовое поле "Input Mask"
13) RegEx Pattern:
- текстовое поле "Expression" + возможность выбрать вариант:
  -- Only Characters: `^[a-zA-Z]+$`
  -- Only Digits: `^[0-9]+(^[.])?$`
  -- Name: `^[a-zA-Z .]+$`
  -- Username: `^[a-z0-9_.]+$`
  -- Character Limit: `^.{0,100}$`
  -- Word Limit: `^(?:\b\w+\b[\s\r\n]*){1,30}$`
  -- Only Gmail: `^[a-z0-9](\.?[a-z0-9]){0,}@(gmail)\.com$`
- текстовое поле "Flags"
14) checkbox "Read-only"
15) checkbox "Hidden"
16) Size & Position:
- number "X" - расположение по оси x
- number "W" - ширина
17) checkbox "Disabled"
18) текстовое поле "Name Attribute" (Name is the unique identifier for the field. It is used to reference the field in the form submission data.)
19) "Enable confirm email field" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть):
- "Label" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- текстовое поле "Placeholder"
- "Helper Text" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- select "Fields placement":
  -- Below
  -- Inline
20) "Invalid Error Message" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть: чекбокс "Show Error Message", если активен "Show Error Message", то появляется чекбокс "Custom Error Message", текстовое поле (textarea) + Prefix Icon и Suffix Icon
21) "Value Range (Min/Max)":
- number "Minimum"
- number "Maximum"
22) checkbox "Include show/hide password icon" (Info: This allows to show the password icon. You can toggle this option to show or hide the password icon.)
23) "Enable confirm password field" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть):
- "Label" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- текстовое поле "Placeholder"
- "Helper Text" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- select "Fields placement":
  -- Below
  -- Inline
24) аккордеон "Validations"
находится под "Helper Text"
конструкции по типу ${isNumberExistIcn}, можно заменить на другие, которые посчитаешь нужными, эти конструкции будут выводить символы <span style="color: red;">✖</span> или <span style="color: green;">✔</span>
- checkbox At least one digit (0-9) - value: (?=.*[0-9]) вставляет в "Helper Text": <span style="margin-right:20px;">${isNumberExistIcn} One number</span>
- checkbox At least one lowercase character (a-z) - value: (?=.*[a-z]) вставляет в "Helper Text": <span style="margin-right:20px;">${isLowercaseExistIcn} One lowercase character</span>
- checkbox At least one uppercase character (A-Z) - value: (?=.*[A-Z]) вставляет в "Helper Text": <span style="margin-right:20px;">${isUppercaseExistIcn} One uppercase character</span>
- checkbox At least one special character (~!@#$%^&*(){}[]<>+-_=/\|;:,.) - value: (?=.*[~!@#$%^&*(){}[$_bf_$]<>+$_bf_$-_=$_bf_$$_bf_$/|;:,.]) (что означает $_bf_$ не знаю!) вставляет в "Helper Text": <span style="margin-right:20px;">${isSpecialExistIcn} One special character</span>
- checkbox "Limit Password Length": вставляет в "Helper Text": <span style="margin-right:20px;">${isLimitValidIcn} 8 to 32 characters</span>
-- number "Min"
-- number "Max"
25) number "Step"
26) "Rating Icon" - ImageField с "iconMode: true" (это иконка по дефолту)
27) "Options" репитер, так же нужен handle:
- "Icon" - ImageField с "iconMode: true"
- text "Label"
- text "Value"
- checkbox "Check"
- button "Add Option" - добавляет сразу под этой опцией
- button "Clone Option" - клонирует эту опцию
- button "Delete Option" - удаляет эту опцию
28) select "Rating Position"
- Left
- Center
- Right
29) checkbox "Show rating message on hover" (Info: This allows to show the rating message on hover. You can toggle this option to show or hide the rating message on hover.)
30) checkbox "Show Rating Message On Selected" (Info: This allows to show the rating message on rating selected. You can toggle this option to show or hide the rating message on rating selected.)
31) "Button Text":
- textarea
- Prefix Icon
- Suffix Icon
32) select "Button Type":
- Reset
- Button
- Submit
33) checkbox "Full Width"
34) select "Button Align":
- Left
- Center
- Right
35) "Allow Multiple" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- number "Minimum File", для этого поля:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле (только если выбрано "Custom Error Message")
- number "Maximum File", для этого поля:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле (только если выбрано "Custom Error Message")
36) select "Allowed File Type":
- Images (value: .xbm,.tif,.pjp,.pjpeg,.svgz,.jpg,.jpeg,.ico,.tiff,.gif,.svg,.bmp,.png,.jfif,.webp,.tif)
- Audios (value: .opus,.flac,.webm,.weba,.wav,.ogg,.m4a,.mp3,.oga,.mid,.amr,.aiff,.wma,.au,.acc,.wpl)
- Videos (value: .ogm,.wmv,.mpg,.webm,.ogv,.mov,.asx,.mpeg,.mp4,.m4v,.avi,.3g2,.3gp,.flv,.mkv,.swf)
- Documents (value: .doc,.docx,.odt,.pdf,.rtf,.tex,.txt,.wks,.wps,.wpd)
- Zip (value: .7z,.arj,.deb,.pkg,.rar,.rpm,.gz,.z,.zip)
- Presentation (value: .key,.odp,.pps,.ppt,.pptx)
- Spreadsheet (value: .ods,.xlr,.xls,.xlsx)
- Databases (value: .csv,.dat,.db,.dbf,.log,.mdb,.sav,.sql,.tar,.sql,.sqlite,.xml)
37) text "Upload Button Text:" - default: Attach File
38) text "File Select Status" - default: No File Selected (Info: By enabling this feature, you will see file select status)
39) text "Show Maximum Size" - placeholder: "Write a Max Size Label Ex:(Max 2MB)" (Info: By disabling this option, the field show maximum size will be hidden)
40) "Allow Maximum Upload Size" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- number - default: 2MB
- checkbox "Total Maximum Size" - default: false
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле (только если выбрано "Custom Error Message") - default: Maximum file size exceeded. (Max: ${maximum_size}MB)
41) Show File List:
- checkbox "Show File Preview"
- checkbox "Show File Size"
42) text "File Exist Message" - default: A file already exists
43) "Value Range (Min/Max)":
    (Date - type="date", Time - type="time", Date-Time - type="datetime-local", Week - type="week", Month - type="month")
- "Minimum"
- "Maximum"
44) "Options" репитер, так же нужен handle:
- "Image" - ImageField с "iconMode: true"
- text "Label"
- text "Value"
- checkbox "Check"
- checkbox "Required"
- checkbox "Disabled"
- button "Add Option" - добавляет сразу под этой опцией
- button "Clone Option" - клонирует эту опцию
- button "Delete Option" - удаляет эту опцию
45) checkbox "Allow Multiple"
46) number "Minimum" и number "Maximum" - если включена "Allow Multiple" (45)
47) number "Item Size" - default: 200
48) Check Position:
- button top-left (<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm10 6h-4m0 0v4m0-4l4 4"></path></svg>)
- button top-right (<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm10 10v-4m0 0h-4m4 0l-4 4"></path></svg>)
- button center (<svg width="30" height="30" viewBox="0 0 30 30"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.4,4.16H23.6a2.43,2.43,0,0,1,2.45,2.41V23.43a2.43,2.43,0,0,1-2.45,2.41H6.4A2.43,2.43,0,0,1,4,23.43V6.57A2.43,2.43,0,0,1,6.4,4.16Z"></path><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="15" y1="10.18" x2="15" y2="19.82"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="10.09" y1="15" x2="19.91" y2="15"></line></svg>)
- button bottom-left (<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm6 6v4m0 0h4m-4 0l4-4"></path></svg>)
- button bottom-right (<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm6 10h4m0 0v-4m0 4l-4-4"></path></svg>)
49) checkbox "Hide Image Label"
50) "Options" репитер, так же нужен handle:
- text "Label"
- text "Value"
- checkbox "Check"
- button "Add Option" - добавляет сразу под этой опцией
- button "Clone Option" - клонирует эту опцию
- button "Delete Option" - удаляет эту опцию
51) number "Options Column"
52) Minimum:
- number
поля если number > 0:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле default: Select at least ${minimum} option(s) (только если выбрано "Custom Error Message") + Prefix Icon и Suffix Icon
53) Maximum:
- number
поля если number > 0:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле default: Please, select no more than ${field.maximum} option(s) (только если выбрано "Custom Error Message") + Prefix Icon и Suffix Icon
54) checkbox "Allow Multiple Select"
- number "Minimum Option"
  если "Minimum Option" > 0:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле default: Select at least ${minimum} option(s) (только если выбрано "Custom Error Message")
- number "Maximum Option"
  если "Maximum Option" > 0:
- checkbox "Show Error Message"
- checkbox "Custom Error Message"
- текстовое поле default: Select at least ${maximum} option(s) (только если выбрано "Custom Error Message")
55) checkbox "Show Search Input"
56) text "Search Placeholder" - если активно "Show Search Input"
57) checkbox "Search Clearable" (Info: By disabling this option, the field search clearable will be hidden)
58) checkbox "Selected Option Clearable" (Info: By disabling this option, the field selected option clearable will be hidden)
59) checkbox "Show Selected Option Image" (Info: By disabling this option, the field show selected option image will be hidden)
60) number "Options List Height": default: 400
61) checkbox "Option Icon/Image" (Info: By disabling this option, the field option icon will be hidden)
62) "Title" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- textarea "Text"
- select "HTML Tag":
-- h1: H1
-- h2: H2
-- h3: H3
-- h4: H4
-- h5: H5
-- h6: H6
-- div: Div
-- span: Span
-- p: p
- Prefix Icon и Suffix Icon
63) "Subtitle" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- textarea "Text"
- select "HTML Tag":
  -- h1: H1
  -- h2: H2
  -- h3: H3
  -- h4: H4
  -- h5: H5
  -- h6: H6
  -- div: Div
  -- span: Span
  -- p: p
- Prefix Icon и Suffix Icon
64) "Logo/Icon" - ImageField с "iconMode: true"
65) "Label Alignment":
- Left (<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="6.81" x2="21.1" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="23.19" x2="21.1" y2="23.19"></line></svg>)
- Center (<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="5.45" y1="6.81" x2="24.55" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="5.45" y1="23.19" x2="24.55" y2="23.19"></line></svg>)
- Right (<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="8.9" y1="6.81" x2="28" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="8.9" y1="23.19" x2="28" y2="23.19"></line></svg>)
66) "Layout Direction":
    (Одна иконка с трансформацией (<svg width="17" height="17" viewBox="0 0 24 24" style="transform: rotate(0deg);"><path fill="currentColor" d="M5 21q-.425 0-.713-.288Q4 20.425 4 20t.287-.712Q4.575 19 5 19h14q.425 0 .712.288q.288.287.288.712t-.288.712Q19.425 21 19 21Zm7-4.425q-.2 0-.375-.063q-.175-.062-.325-.212l-3.625-3.625Q7.4 12.4 7.4 12t.3-.7q.275-.275.7-.275q.425 0 .7.275l1.9 1.9V4q0-.425.288-.713Q11.575 3 12 3t.713.287Q13 3.575 13 4v9.2l1.925-1.925Q15.2 11 15.6 11t.7.3q.275.275.275.7q0 .425-.275.7l-3.6 3.6q-.15.15-.325.212q-.175.063-.375.063Z"></path></svg>))
- Vertical
- Vertical Reverse
- Horizontal
- Horizontal Reverse
67) "Image" - ImageField
68) number "Width" and number "Height"
69) textarea "Image Alt Text"
