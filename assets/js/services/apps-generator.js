(function (global) {
    'use strict';

    var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    var DEFAULT_OO = {
        руководительОО_первый_полностью: 'Жирнова Юлия Витальевна',
        телефон_руководительОО_первый: '8-915-059-42-53',
        руководительОО_второй_полностью: 'Тарджиманян Лия Николаевна',
        телефон_руководительОО_второй: '8-915-059-50-47'
    };

    var ORG_FIELDS = [
        { key: 'названиеПО', label: 'Название организации (ПО)', hint: 'Полное название, как в договоре', placeholder: 'ООО «Ромашка»', required: true },
        { key: 'адресПО', label: 'Адрес организации', hint: 'Юридический или фактический адрес', placeholder: 'г. Москва, ул. Ленина, д. 1' },
        { key: 'помещение', label: 'Помещение для практики', hint: 'Например: Офис 1, ИТ-отдел', placeholder: 'Офис 1' },
        { key: 'должность_руководительПО', label: 'Должность руководителя организации', hint: 'Тот, кто подписывает договор', placeholder: 'Генеральный директор' },
        { key: 'должность_наставникПО', label: 'Должность наставника от организации', hint: 'Непосредственный руководитель студента', placeholder: 'Ведущий программист' },
        { key: 'руководительПО_наставник_полностью', label: 'ФИО наставника от организации', hint: 'Фамилия, имя и отчество полностью', placeholder: 'Петров Пётр Петрович' },
        { key: 'телефон_руководительПО_наставник', label: 'Телефон наставника', hint: 'Контактный телефон', placeholder: '8-900-123-45-67' },
        { key: 'ответственныйПО', label: 'Ответственный от организации (ФИО)', hint: 'Сотрудник, ответственный за практикантов', placeholder: 'Иванова А.А.' },
        { key: 'ответственныйПО_телефон', label: 'Телефон ответственного', hint: 'Контактный телефон', placeholder: '8-900-765-43-21' }
    ];

    var OO_FIELDS = [
        { key: 'руководительОО_первый_полностью', label: 'Руководитель практики от техникума (1) — ФИО', hint: 'ФИО полностью' },
        { key: 'телефон_руководительОО_первый', label: 'Телефон (1)', hint: 'Контактный телефон' },
        { key: 'руководительОО_второй_полностью', label: 'Руководитель практики от техникума (2) — ФИО', hint: 'ФИО полностью (если один, продублируйте)' },
        { key: 'телефон_руководительОО_второй', label: 'Телефон (2)', hint: 'Контактный телефон' }
    ];

    function parseDate(str) {
        var m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(str || ''));
        if (!m) return null;
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    }

    function monthInWords(dateStr) {
        var m = /^\s*\d{1,2}\.(\d{1,2})\.\d{4}\s*$/.exec(String(dateStr || ''));
        if (!m) return '____';
        return MONTHS[Number(m[1]) - 1] || '____';
    }

    function dayOf(dateStr) {
        var m = /^\s*(\d{1,2})\.\d{1,2}\.\d{4}\s*$/.exec(String(dateStr || ''));
        return m ? m[1] : '__';
    }

    function yearOf(dateStr) {
        var m = /^\s*\d{1,2}\.\d{1,2}\.(\d{4})\s*$/.exec(String(dateStr || ''));
        return m ? m[1] : '20__';
    }

    function same(a, b) {
        return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
    }

    function findGroup(groups, groupCode) {
        return groups.find(function (g) { return same(g.code, groupCode); }) || null;
    }

    function findCalendar(calendar, groupCode, semester, practiceType) {
        return calendar.find(function (c) {
            return same(c.group_code, groupCode) &&
                   String(c.semester) === String(semester) &&
                   same(c.practice_type, practiceType);
        }) || null;
    }

    function buildDocData(p) {
        var modules = p.modules || [];
        var cal = p.calendar;
        var group = p.group;
        var org = p.org || {};
        var oo = Object.assign({}, DEFAULT_OO, p.oo || {});

        var names = [];
        modules.forEach(function (m) {
            var n = (m.pm_code + ' ' + m.pm_name).trim();
            if (names.indexOf(n) === -1) names.push(n);
        });
        var hours = modules.reduce(function (s, m) { return s + (parseInt(m.hours, 10) || 0); }, 0);

        var start = cal ? cal.start_date : '';
        var end = cal ? cal.end_date : '';

        var data = {
            модуль: names.length ? names.join(', ') : 'Модуль не найден в справочнике',
            день_начала: dayOf(start),
            месяц_начала: monthInWords(start),
            день_заверешения: dayOf(end),
            месяц_заверешения: monthInWords(end),
            год: yearOf(start),
            специальность: group ? (group.spec_code + ' ' + group.spec_name) : 'Специальность не найдена',
            часы: hours ? String(hours) : '0'
        };

        Object.assign(data, oo);
        ORG_FIELDS.forEach(function (f) {
            data[f.key] = String(org[f.key] == null ? '' : org[f.key]).trim();
        });

        Object.keys(data).forEach(function (k) {
            if (data[k] === '') data[k] = '____________';
        });

        data.students = p.students || [];
        return data;
    }

    function getDocxtemplaterClass() {
        return global.docxtemplater || global.Docxtemplater;
    }

    function renderTemplate(templateBuffer, data) {
        var Docx = getDocxtemplaterClass();
        if (!Docx) throw new Error('Библиотека docxtemplater не загружена');
        if (!global.PizZip) throw new Error('Библиотека PizZip не загружена');

        var zip = new global.PizZip(templateBuffer);
        var doc = new Docx(zip, {
            delimiters: { start: '{{', end: '}}' }, // <-- ГЛАВНОЕ ИСПРАВЛЕНИЕ ОШИБКИ "Multi error"
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: function () { return ''; }
        });
        doc.render(data);
        return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
    }

    function explainError(e) {
        if (e && e.properties && Array.isArray(e.properties.errors) && e.properties.errors.length) {
            var lines = e.properties.errors.slice(0, 8).map(function (x) {
                var pr = x.properties || {};
                return '• ' + (x.message || pr.id || 'ошибка шаблона') +
                       (pr.xtag ? ' — «' + pr.xtag + '»' : '') +
                       (pr.file ? ' (' + pr.file + ')' : '');
            });
            if (e.properties.errors.length > 8) lines.push('… и ещё ' + (e.properties.errors.length - 8));
            return 'Ошибка в шаблоне Word:\n' + lines.join('\n');
        }
        return (e && e.message) ? e.message : String(e);
    }

    function loadTemplates(basePath) {
        var base = basePath || '../templates/';
        var t = Date.now();
        function get(name) {
            return fetch(base + name + '?t=' + t).then(function (r) {
                if (!r.ok) throw new Error('Не удалось загрузить шаблон ' + name + ' (HTTP ' + r.status + ')');
                return r.arrayBuffer();
            });
        }
        return Promise.all([get('pp-app1.docx'), get('pp-app2.docx')]).then(function (res) {
            return { app1: res[0], app2: res[1] };
        });
    }

    function safeName(s, max) {
        return String(s || '').replace(/[^a-zа-яё0-9]+/gi, '_').replace(/^_+|_+$/g, '').substring(0, max || 30) || 'org';
    }

    global.AppsGenerator = {
        MONTHS: MONTHS,
        DEFAULT_OO: DEFAULT_OO,
        ORG_FIELDS: ORG_FIELDS,
        OO_FIELDS: OO_FIELDS,
        parseDate: parseDate,
        monthInWords: monthInWords,
        findGroup: findGroup,
        findCalendar: findCalendar,
        buildDocData: buildDocData,
        renderTemplate: renderTemplate,
        explainError: explainError,
        loadTemplates: loadTemplates,
        safeName: safeName
    };
})(window);
