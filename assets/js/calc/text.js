// text.js — textes de la calculatrice d'heures du site dans les 7 langues (seo/ESSAI-B.md). Vocabulaire de Google relevé
// dans langues/glossaire.md (événement, agenda, Termin, afspraak, 予定…) et registre de chaque langue (Sie, vous, tú, você,
// です/ます, je). Une phrase à deux formes = [singulier, pluriel] ; {n}, {name}… sont remplis par say().
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.calcText = (function () {
  'use strict';
  var TEXT = {
    en: {
      msg: {
        'not-zip': 'This .zip could not be opened. Try unzipping it and dropping the .ics files.',
        'no-inflate': 'Your browser cannot open .zip files. Unzip the export first, then drop the .ics files.',
        'zip-method': 'This .zip uses a compression the calculator cannot read. Unzip it first, then drop the .ics files.',
        'no-ics': 'No calendar file (.ics) was found in what you dropped.',
        date: 'Choose a valid start date and end date.', order: 'The end date is before the start date.', tooLong: 'Choose a period of 366 days or less.'
      },
      reading: 'Reading your calendar…', placeholder: 'Your totals appear here as soon as a file is read.',
      invalidPeriod: 'Choose a valid period to see your totals.', notCalendar: '{name}: not a calendar file',
      inPeriod: ['{n} event in the period', '{n} events in the period'], heading: '{from} to {to} · times in {zone}',
      summary: ['{hours} hours in {n} event', '{hours} hours in {n} events'], leftOut: 'left out: {list}',
      left: { allDay: ['{n} all-day', '{n} all-day'], declined: ['{n} declined', '{n} declined'], free: ['{n} marked free', '{n} marked free'], duplicate: ['{n} found twice', '{n} found twice'] },
      byKeyword: 'By keyword', byCalendar: 'By calendar', byWeek: 'By week',
      colKeyword: 'Keyword', colCalendar: 'Calendar', colWeek: 'Week starting', colHours: 'Hours', colEvents: 'Events',
      partWeek: '(part of the week)', noKeyword: 'No keyword', noTitle: '(no title)',
      warnRule: ['{n} repeating event uses a rule this calculator cannot expand; only the first date is counted: {titles}.',
        '{n} repeating events use a rule this calculator cannot expand; only the first date is counted: {titles}.'],
      warnLong: ['{n} repeating event goes back too far to be expanded in full; the total may be short: {titles}.',
        '{n} repeating events go back too far to be expanded in full; the total may be short: {titles}.']
    },
    de: {
      msg: {
        'not-zip': 'Diese ZIP-Datei ließ sich nicht öffnen. Entpacken Sie sie und legen Sie die .ics-Dateien hier ab.',
        'no-inflate': 'Ihr Browser kann keine ZIP-Dateien öffnen. Entpacken Sie den Export zuerst und legen Sie dann die .ics-Dateien hier ab.',
        'zip-method': 'Diese ZIP-Datei verwendet eine Komprimierung, die der Rechner nicht lesen kann. Entpacken Sie sie zuerst und legen Sie dann die .ics-Dateien hier ab.',
        'no-ics': 'In den abgelegten Dateien wurde keine Kalenderdatei (.ics) gefunden.',
        date: 'Wählen Sie ein gültiges Start- und Enddatum.', order: 'Das Enddatum liegt vor dem Startdatum.', tooLong: 'Wählen Sie einen Zeitraum von höchstens 366 Tagen.'
      },
      reading: 'Ihr Kalender wird gelesen …', placeholder: 'Ihre Summen erscheinen hier, sobald eine Datei gelesen ist.',
      invalidPeriod: 'Wählen Sie einen gültigen Zeitraum, um Ihre Summen zu sehen.', notCalendar: '{name}: keine Kalenderdatei',
      inPeriod: ['{n} Termin im Zeitraum', '{n} Termine im Zeitraum'], heading: '{from} bis {to} · Uhrzeiten in {zone}',
      summary: ['{hours} Stunden in {n} Termin', '{hours} Stunden in {n} Terminen'], leftOut: 'nicht gezählt: {list}',
      left: { allDay: ['{n} ganztägig', '{n} ganztägig'], declined: ['{n} abgelehnt', '{n} abgelehnt'], free: ['{n} als verfügbar angezeigt', '{n} als verfügbar angezeigt'], duplicate: ['{n} doppelt', '{n} doppelt'] },
      byKeyword: 'Nach Stichwort', byCalendar: 'Nach Kalender', byWeek: 'Nach Woche',
      colKeyword: 'Stichwort', colCalendar: 'Kalender', colWeek: 'Woche ab', colHours: 'Stunden', colEvents: 'Termine',
      partWeek: '(Teil der Woche)', noKeyword: 'Ohne Stichwort', noTitle: '(ohne Titel)',
      warnRule: ['{n} wiederkehrender Termin nutzt eine Regel, die der Rechner nicht auflösen kann; nur das erste Datum wird gezählt: {titles}.',
        '{n} wiederkehrende Termine nutzen eine Regel, die der Rechner nicht auflösen kann; nur das erste Datum wird gezählt: {titles}.'],
      warnLong: ['{n} wiederkehrender Termin reicht zu weit zurück, um vollständig berechnet zu werden; die Summe kann zu niedrig sein: {titles}.',
        '{n} wiederkehrende Termine reichen zu weit zurück, um vollständig berechnet zu werden; die Summe kann zu niedrig sein: {titles}.']
    },
    fr: {
      msg: {
        'not-zip': 'Impossible d’ouvrir ce .zip. Décompressez-le et déposez les fichiers .ics.',
        'no-inflate': 'Votre navigateur ne sait pas ouvrir les fichiers .zip. Décompressez d’abord l’export, puis déposez les fichiers .ics.',
        'zip-method': 'Ce .zip utilise une compression que la calculatrice ne sait pas lire. Décompressez-le d’abord, puis déposez les fichiers .ics.',
        'no-ics': 'Aucun fichier d’agenda (.ics) dans ce que vous avez déposé.',
        date: 'Choisissez une date de début et une date de fin valides.', order: 'La date de fin est antérieure à la date de début.', tooLong: 'Choisissez une période de 366 jours au plus.'
      },
      reading: 'Lecture de votre agenda…', placeholder: 'Vos totaux s’affichent ici dès qu’un fichier est lu.',
      invalidPeriod: 'Choisissez une période valide pour voir vos totaux.', notCalendar: '{name} : ce n’est pas un fichier d’agenda',
      inPeriod: ['{n} événement dans la période', '{n} événements dans la période'], heading: 'Du {from} au {to} · fuseau horaire : {zone}',
      summary: ['{hours} heures sur {n} événement', '{hours} heures sur {n} événements'], leftOut: 'non comptés : {list}',
      left: { allDay: ['{n} (journée entière)', '{n} (journée entière)'], declined: ['{n} (refusé)', '{n} (refusés)'], free: ['{n} (affiché comme disponible)', '{n} (affichés comme disponibles)'], duplicate: ['{n} (en double)', '{n} (en double)'] },
      byKeyword: 'Par mot-clé', byCalendar: 'Par agenda', byWeek: 'Par semaine',
      colKeyword: 'Mot-clé', colCalendar: 'Agenda', colWeek: 'Semaine du', colHours: 'Heures', colEvents: 'Événements',
      partWeek: '(partie de la semaine)', noKeyword: 'Sans mot-clé', noTitle: '(sans titre)',
      warnRule: ['{n} événement périodique suit une règle que la calculatrice ne sait pas développer ; seule la première date est comptée : {titles}.',
        '{n} événements périodiques suivent une règle que la calculatrice ne sait pas développer ; seule la première date est comptée : {titles}.'],
      warnLong: ['{n} événement périodique remonte trop loin pour être développé en entier ; le total peut être inférieur à la réalité : {titles}.',
        '{n} événements périodiques remontent trop loin pour être développés en entier ; le total peut être inférieur à la réalité : {titles}.']
    },
    es: {
      msg: {
        'not-zip': 'No se ha podido abrir este .zip. Descomprímelo y suelta aquí los archivos .ics.',
        'no-inflate': 'Tu navegador no puede abrir archivos .zip. Descomprime primero la exportación y suelta aquí los archivos .ics.',
        'zip-method': 'Este .zip usa una compresión que la calculadora no puede leer. Descomprímelo primero y suelta aquí los archivos .ics.',
        'no-ics': 'No se ha encontrado ningún archivo de calendario (.ics) en lo que has soltado.',
        date: 'Elige una fecha de inicio y una fecha de fin válidas.', order: 'La fecha de fin es anterior a la de inicio.', tooLong: 'Elige un periodo de 366 días como máximo.'
      },
      reading: 'Leyendo tu calendario…', placeholder: 'Tus totales aparecerán aquí en cuanto se lea un archivo.',
      invalidPeriod: 'Elige un periodo válido para ver tus totales.', notCalendar: '{name}: no es un archivo de calendario',
      inPeriod: ['{n} evento en el periodo', '{n} eventos en el periodo'], heading: 'Del {from} al {to} · horas en {zone}',
      summary: ['{hours} horas en {n} evento', '{hours} horas en {n} eventos'], leftOut: 'sin contar: {list}',
      left: { allDay: ['{n} (todo el día)', '{n} (todo el día)'], declined: ['{n} (rechazado)', '{n} (rechazados)'], free: ['{n} (mostrado como disponible)', '{n} (mostrados como disponible)'], duplicate: ['{n} (duplicado)', '{n} (duplicados)'] },
      byKeyword: 'Por palabra clave', byCalendar: 'Por calendario', byWeek: 'Por semana',
      colKeyword: 'Palabra clave', colCalendar: 'Calendario', colWeek: 'Semana del', colHours: 'Horas', colEvents: 'Eventos',
      partWeek: '(parte de la semana)', noKeyword: 'Sin palabra clave', noTitle: '(sin título)',
      warnRule: ['{n} evento periódico usa una regla que la calculadora no sabe desarrollar; solo se cuenta la primera fecha: {titles}.',
        '{n} eventos periódicos usan una regla que la calculadora no sabe desarrollar; solo se cuenta la primera fecha: {titles}.'],
      warnLong: ['{n} evento periódico empezó hace demasiado tiempo para desarrollarlo entero; el total puede quedarse corto: {titles}.',
        '{n} eventos periódicos empezaron hace demasiado tiempo para desarrollarlos enteros; el total puede quedarse corto: {titles}.']
    },
    'pt-BR': {
      msg: {
        'not-zip': 'Não foi possível abrir este .zip. Descompacte-o e solte aqui os arquivos .ics.',
        'no-inflate': 'Seu navegador não consegue abrir arquivos .zip. Descompacte a exportação primeiro e depois solte aqui os arquivos .ics.',
        'zip-method': 'Este .zip usa uma compactação que a calculadora não consegue ler. Descompacte-o primeiro e depois solte aqui os arquivos .ics.',
        'no-ics': 'Nenhum arquivo de agenda (.ics) foi encontrado no que você soltou.',
        date: 'Escolha uma data de início e uma data de término válidas.', order: 'A data de término é anterior à data de início.', tooLong: 'Escolha um período de até 366 dias.'
      },
      reading: 'Lendo sua agenda…', placeholder: 'Seus totais aparecem aqui assim que um arquivo for lido.',
      invalidPeriod: 'Escolha um período válido para ver seus totais.', notCalendar: '{name}: não é um arquivo de agenda',
      inPeriod: ['{n} evento no período', '{n} eventos no período'], heading: 'De {from} a {to} · horários de {zone}',
      summary: ['{hours} horas em {n} evento', '{hours} horas em {n} eventos'], leftOut: 'não contados: {list}',
      left: { allDay: ['{n} (dia inteiro)', '{n} (dia inteiro)'], declined: ['{n} (recusado)', '{n} (recusados)'], free: ['{n} (mostrado como livre)', '{n} (mostrados como livre)'], duplicate: ['{n} (duplicado)', '{n} (duplicados)'] },
      byKeyword: 'Por palavra-chave', byCalendar: 'Por agenda', byWeek: 'Por semana',
      colKeyword: 'Palavra-chave', colCalendar: 'Agenda', colWeek: 'Semana de', colHours: 'Horas', colEvents: 'Eventos',
      partWeek: '(parte da semana)', noKeyword: 'Sem palavra-chave', noTitle: '(sem título)',
      warnRule: ['{n} evento recorrente usa uma regra que a calculadora não consegue expandir; só a primeira data é contada: {titles}.',
        '{n} eventos recorrentes usam uma regra que a calculadora não consegue expandir; só a primeira data é contada: {titles}.'],
      warnLong: ['{n} evento recorrente começa há tanto tempo que não pode ser expandido por inteiro; o total pode ficar abaixo do real: {titles}.',
        '{n} eventos recorrentes começam há tanto tempo que não podem ser expandidos por inteiro; o total pode ficar abaixo do real: {titles}.']
    },
    ja: {
      msg: {
        'not-zip': 'この .zip ファイルを開けませんでした。解凍して、.ics ファイルをドロップしてください。',
        'no-inflate': 'お使いのブラウザでは .zip ファイルを開けません。先にエクスポートしたファイルを解凍し、.ics ファイルをドロップしてください。',
        'zip-method': 'この .zip は、この集計ツールでは読めない圧縮方式を使っています。先に解凍し、.ics ファイルをドロップしてください。',
        'no-ics': 'ドロップしたファイルにカレンダー ファイル（.ics）が見つかりませんでした。',
        date: '有効な開始日と終了日を選んでください。', order: '終了日が開始日より前になっています。', tooLong: '366 日以内の期間を選んでください。'
      },
      reading: 'カレンダーを読み込んでいます…', placeholder: 'ファイルを読み込むと、ここに合計が表示されます。',
      invalidPeriod: '合計を表示するには、有効な期間を選んでください。', notCalendar: '{name}：カレンダー ファイルではありません',
      inPeriod: ['期間内の予定 {n} 件', '期間内の予定 {n} 件'], heading: '{from}～{to}・時刻は {zone}',
      summary: ['予定 {n} 件で {hours} 時間', '予定 {n} 件で {hours} 時間'], leftOut: '除外：{list}',
      left: { allDay: ['終日 {n} 件', '終日 {n} 件'], declined: ['辞退 {n} 件', '辞退 {n} 件'], free: ['「空き時間」{n} 件', '「空き時間」{n} 件'], duplicate: ['重複 {n} 件', '重複 {n} 件'] },
      byKeyword: 'キーワード別', byCalendar: 'カレンダー別', byWeek: '週別',
      colKeyword: 'キーワード', colCalendar: 'カレンダー', colWeek: '週の開始日', colHours: '時間', colEvents: '予定',
      partWeek: '（週の一部）', noKeyword: 'キーワードなし', noTitle: '（タイトルなし）',
      warnRule: ['定期的な予定 {n} 件は、この集計ツールでは展開できないルールを使っています。最初の日付のみを数えています：{titles}。',
        '定期的な予定 {n} 件は、この集計ツールでは展開できないルールを使っています。最初の日付のみを数えています：{titles}。'],
      warnLong: ['定期的な予定 {n} 件は開始日が古すぎるため、すべては展開できません。合計が実際より少ない可能性があります：{titles}。',
        '定期的な予定 {n} 件は開始日が古すぎるため、すべては展開できません。合計が実際より少ない可能性があります：{titles}。']
    },
    nl: {
      msg: {
        'not-zip': 'Dit .zip-bestand kon niet worden geopend. Pak het uit en zet de .ics-bestanden hier neer.',
        'no-inflate': 'Je browser kan geen .zip-bestanden openen. Pak de export eerst uit en zet daarna de .ics-bestanden hier neer.',
        'zip-method': 'Dit .zip-bestand gebruikt een compressiemethode die de calculator niet kan lezen. Pak het eerst uit en zet daarna de .ics-bestanden hier neer.',
        'no-ics': 'Er is geen agendabestand (.ics) gevonden in wat je hebt neergezet.',
        date: 'Kies een geldige begin- en einddatum.', order: 'De einddatum ligt vóór de begindatum.', tooLong: 'Kies een periode van maximaal 366 dagen.'
      },
      reading: 'Je agenda wordt gelezen…', placeholder: 'Je totalen verschijnen hier zodra een bestand is gelezen.',
      invalidPeriod: 'Kies een geldige periode om je totalen te zien.', notCalendar: '{name}: geen agendabestand',
      inPeriod: ['{n} afspraak in de periode', '{n} afspraken in de periode'], heading: '{from} t/m {to} · tijden in {zone}',
      summary: ['{hours} uur in {n} afspraak', '{hours} uur in {n} afspraken'], leftOut: 'niet meegeteld: {list}',
      left: { allDay: ['{n} (hele dag)', '{n} (hele dag)'], declined: ['{n} (afgewezen)', '{n} (afgewezen)'], free: ['{n} (weergegeven als beschikbaar)', '{n} (weergegeven als beschikbaar)'], duplicate: ['{n} (dubbel)', '{n} (dubbel)'] },
      byKeyword: 'Per trefwoord', byCalendar: 'Per agenda', byWeek: 'Per week',
      colKeyword: 'Trefwoord', colCalendar: 'Agenda', colWeek: 'Week vanaf', colHours: 'Uren', colEvents: 'Afspraken',
      partWeek: '(deel van de week)', noKeyword: 'Zonder trefwoord', noTitle: '(geen titel)',
      warnRule: ['{n} terugkerende afspraak gebruikt een regel die de calculator niet kan uitwerken; alleen de eerste datum telt mee: {titles}.',
        '{n} terugkerende afspraken gebruiken een regel die de calculator niet kan uitwerken; alleen de eerste datum telt mee: {titles}.'],
      warnLong: ['{n} terugkerende afspraak gaat te ver terug om volledig te worden uitgewerkt; het totaal kan te laag zijn: {titles}.',
        '{n} terugkerende afspraken gaan te ver terug om volledig te worden uitgewerkt; het totaal kan te laag zijn: {titles}.']
    }
  };
  // Calculatrice d'heures facturables (billable.js, 2026-10-17) : mêmes langues, mêmes règles d'emplacements.
  TEXT.en.bill = { placeholder: 'Type one duration per line to see the result.', colEntry: 'Entry', colTime: 'Time', colDecimal: 'Decimal hours',
    colBilled: 'Billed', colAmount: 'Amount', total: 'Total', invalid: ['{n} line could not be read: {list}.', '{n} lines could not be read: {list}.'],
    sub: '{hours} hours billed for {real} worked', subAmount: '{hours} hours billed for {real} worked · amount {amount}',
    once: 'Rounding only the total instead: {billed} ({hours} hours).', onceAmount: 'Rounding only the total instead: {billed} ({hours} hours), {amount}.' };
  TEXT.de.bill = { placeholder: 'Geben Sie eine Dauer pro Zeile ein, um das Ergebnis zu sehen.', colEntry: 'Eingabe', colTime: 'Dauer', colDecimal: 'Dezimalstunden',
    colBilled: 'Abgerechnet', colAmount: 'Betrag', total: 'Summe', invalid: ['{n} Zeile konnte nicht gelesen werden: {list}.', '{n} Zeilen konnten nicht gelesen werden: {list}.'],
    sub: '{hours} Stunden abgerechnet bei {real} Arbeitszeit', subAmount: '{hours} Stunden abgerechnet bei {real} Arbeitszeit · Betrag {amount}',
    once: 'Wenn nur die Summe gerundet wird: {billed} ({hours} Stunden).', onceAmount: 'Wenn nur die Summe gerundet wird: {billed} ({hours} Stunden), {amount}.' };
  TEXT.fr.bill = { placeholder: 'Tapez une durée par ligne pour voir le résultat.', colEntry: 'Saisie', colTime: 'Durée', colDecimal: 'Heures décimales',
    colBilled: 'Facturé', colAmount: 'Montant', total: 'Total', invalid: ['{n} ligne illisible : {list}.', '{n} lignes illisibles : {list}.'],
    sub: '{hours} h facturées pour {real} de travail', subAmount: '{hours} h facturées pour {real} de travail · montant {amount}',
    once: 'En arrondissant seulement le total : {billed} ({hours} h).', onceAmount: 'En arrondissant seulement le total : {billed} ({hours} h), {amount}.' };
  TEXT.es.bill = { placeholder: 'Escribe una duración por línea para ver el resultado.', colEntry: 'Entrada', colTime: 'Duración', colDecimal: 'Horas decimales',
    colBilled: 'Facturado', colAmount: 'Importe', total: 'Total', invalid: ['No se ha podido leer {n} línea: {list}.', 'No se han podido leer {n} líneas: {list}.'],
    sub: '{hours} horas facturadas por {real} de trabajo', subAmount: '{hours} horas facturadas por {real} de trabajo · importe {amount}',
    once: 'Si solo redondeas el total: {billed} ({hours} horas).', onceAmount: 'Si solo redondeas el total: {billed} ({hours} horas), {amount}.' };
  TEXT['pt-BR'].bill = { placeholder: 'Digite uma duração por linha para ver o resultado.', colEntry: 'Entrada', colTime: 'Duração', colDecimal: 'Horas decimais',
    colBilled: 'Faturado', colAmount: 'Valor', total: 'Total', invalid: ['{n} linha não pôde ser lida: {list}.', '{n} linhas não puderam ser lidas: {list}.'],
    sub: '{hours} horas faturadas por {real} de trabalho', subAmount: '{hours} horas faturadas por {real} de trabalho · valor {amount}',
    once: 'Arredondando só o total: {billed} ({hours} horas).', onceAmount: 'Arredondando só o total: {billed} ({hours} horas), {amount}.' };
  TEXT.ja.bill = { placeholder: '1 行に 1 つずつ時間を入力すると、結果が表示されます。', colEntry: '入力', colTime: '時間', colDecimal: '10進数の時間',
    colBilled: '請求時間', colAmount: '金額', total: '合計', invalid: ['読み取れない行が {n} 行あります：{list}。', '読み取れない行が {n} 行あります：{list}。'],
    sub: '作業時間 {real} に対して請求 {hours} 時間', subAmount: '作業時間 {real} に対して請求 {hours} 時間・金額 {amount}',
    once: '合計だけを切り上げた場合：{billed}（{hours} 時間）。', onceAmount: '合計だけを切り上げた場合：{billed}（{hours} 時間）、{amount}。' };
  TEXT.nl.bill = { placeholder: 'Typ één duur per regel om het resultaat te zien.', colEntry: 'Invoer', colTime: 'Duur', colDecimal: 'Decimale uren',
    colBilled: 'Gefactureerd', colAmount: 'Bedrag', total: 'Totaal', invalid: ['{n} regel kon niet worden gelezen: {list}.', '{n} regels konden niet worden gelezen: {list}.'],
    sub: '{hours} uur gefactureerd voor {real} werk', subAmount: '{hours} uur gefactureerd voor {real} werk · bedrag {amount}',
    once: 'Als je alleen het totaal afrondt: {billed} ({hours} uur).', onceAmount: 'Als je alleen het totaal afrondt: {billed} ({hours} uur), {amount}.' };
  // Code de langue de la page (« de-AT » → « de ») ; l'anglais par défaut.
  function lang(code) { var c = String(code || ''); if (TEXT[c]) return c; var b = c.split('-')[0]; return TEXT[b] ? b : 'en'; }
  // Pluriel selon CLDR (Intl.PluralRules) : « one » → première forme (0 et 1 en français et en portugais du Brésil, 1 ailleurs) ;
  // le japonais n'a qu'une forme, écrite deux fois.
  function plural(l, n) { return new Intl.PluralRules(l).select(n) === 'one' ? 0 : 1; }
  function get(l, key) { return key.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, TEXT[l]); }
  function say(code, key, vars) {
    var l = lang(code), v = vars || {}, s = get(l, key);
    if (s == null) s = get('en', key);
    // Clé inconnue : chaîne vide, jamais « undefined » à l'écran (l'appelant garde son texte de secours).
    if (s == null) return '';
    if (Array.isArray(s)) s = s[plural(l, Number(v.n))];
    return String(s).replace(/[{]([a-z]+)[}]/g, function (m, k) { return v[k] != null ? String(v[k]) : m; });
  }
  return { TEXT: TEXT, lang: lang, say: say };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.calcText;
