Все icon это компонент ImageField с "iconMode: true"
Опции поля (данные опции (возможно частично), в дальнейшем будут использоваться и для других полей):
1) "Label" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле (textarea) + Prefix Icon и Suffix Icon
2) "Required" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть:
- чекбокс "Show Error Message"
- чекбокс "Custom Error Message"
- текстовое поле (только если выбрано "Custom Error Message") + Prefix Icon и Suffix Icon
- чекбокс "Show Asterisk Symbol"
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
14) чекбокс "Read-only"
15) чекбокс "Hidden"
16) Size & Position:
- number "X" - расположение по оси x
- number "W" - ширина
17) чекбокс "Disabled"
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
22) чекбокс "Include show/hide password icon" (Info: This allows to show the password icon. You can toggle this option to show or hide the password icon.)
23) "Enable confirm password field" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть):
- "Label" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- текстовое поле "Placeholder"
- "Helper Text" - чекбокс в аккордеоне (слева от стрелки), если выбрать, открывается аккордеон (который стает активный и его можно закрыть/открыть) и там есть текстовое поле + Prefix Icon и Suffix Icon
- select "Fields placement":
  -- Below
  -- Inline
24) аккордеон "Validations"
находится под "Helper Text"
конструкции по типу ${isNumberExistIcn}, можно заменить на другие которые посчитаешь нужными, эти конструкции будут выводить символы <span style="color: red;">✖</span> или <span style="color: green;">✔</span>
- чекбокс At least one digit (0-9) - value: (?=.*[0-9]) вставляет в "Helper Text": <span style="margin-right:20px;">${isNumberExistIcn} One number</span>
- чекбокс At least one lowercase character (a-z) - value: (?=.*[a-z]) вставляет в "Helper Text": <span style="margin-right:20px;">${isLowercaseExistIcn} One lowercase character</span>
- чекбокс At least one uppercase character (A-Z) - value: (?=.*[A-Z]) вставляет в "Helper Text": <span style="margin-right:20px;">${isUppercaseExistIcn} One uppercase character</span>
- чекбокс At least one special character (~!@#$%^&*(){}[]<>+-_=/\|;:,.) - value: (?=.*[~!@#$%^&*(){}[$_bf_$]<>+$_bf_$-_=$_bf_$$_bf_$/|;:,.]) (что означает $_bf_$ не знаю!) вставляет в "Helper Text": <span style="margin-right:20px;">${isSpecialExistIcn} One special character</span>
- чекбокс "Limit Password Length": вставляет в "Helper Text": <span style="margin-right:20px;">${isLimitValidIcn} 8 to 32 characters</span>
-- number "Min"
-- number "Max"
