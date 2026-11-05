document.addEventListener('DOMContentLoaded', () => {
    const excelInput = document.getElementById('excelFile');
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    const btnGenerate = document.getElementById('btnGenerate');
    const btnDownloadZip = document.getElementById('btnDownloadZip');
    const statusLog = document.getElementById('statusLog');
    const downloadArea = document.getElementById('downloadArea');

    let excelData = [];
    let generatedZip = null;
    let refData = { groups: [], calendar: [], modules: [] };

    async function loadRefData() {
        try {
            const t = Date.now();
            refData.groups = await (await fetch(`../data/groups.json?t=${t}`)).json();
            refData.calendar = await (await fetch(`../data/calendar.json?t=${t}`)).json();
            refData.modules = await (await fetch(`../data/modules.json?t=${t}`)).json();
            statusLog.textContent = '✅ Справочники загружены. Готов к работе.';
            
            if (!document.getElementById('btnGenerate')) {
                const btn = document.createElement('button');
                btn.id = 'btnGenerate';
                btn.className = 'btn btn-primary';
                btn.textContent = '⚙️ Сгенерировать приложения';
                btn.disabled = true;
                statusLog.parentNode.insertBefore(btn, statusLog.nextSibling);
                btn.addEventListener('click', generateDocuments);
            }
        } catch (e) {
            statusLog.textContent = `❌ Ошибка загрузки справочников: ${e.message}\nУбедитесь, что запущен python3 -m http.server 8000`;
        }
    }
    loadRefData();

    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', () => {
            const wb = XLSX.utils.book_new();
            const headers = [
                "Группа", "Тип_практики", "ФИО", "Дата рождения", 
                "названиеПО", "должность_руководительПО", "руководительПО_наставник_полностью", 
                "телефон_руководительПО_наставник", "ответственныйПО", "ответственныйПО_телефон", 
                "адресПО", "помещение"
            ];
            const example = [
                "ИС-24", "УП", "Иванов Иван Иванович", "01.01.2008",
                "ООО Ромашка", "Директор", "Петров Петр Петрович", "89001234567",
                "Иванов Иван", "89007654321", "г. Москва, ул. Ленина 1", "Офис 1"
            ];
            const ws = XLSX.utils.aoa_to_sheet([headers, example]);
            ws['!cols'] = headers.map(() => ({ wch: 25 }));
            XLSX.utils.book_append_sheet(wb, ws, "Шаблон");
            XLSX.writeFile(wb, "Шаблон_для_генерации_приложений.xlsx");
        });
    }

    excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        statusLog.textContent = '⏳ Чтение файла Excel...';
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
                
                const genBtn = document.getElementById('btnGenerate');
                if (genBtn) {
                    genBtn.disabled = false;
                    statusLog.textContent = `✅ Загружено ${excelData.length} строк. Нажмите "Сгенерировать приложения".`;
                }
            } catch (error) {
                statusLog.textContent = `❌ Ошибка чтения Excel: ${error.message}`;
            }
        };
        reader.readAsArrayBuffer(file);
    });

    function getMonthInWords(dateStr) {
        if (!dateStr) return '____';
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        const parts = String(dateStr).split('.');
        if (parts.length >= 2) {
            const monthIndex = parseInt(parts[1], 10) - 1;
            return months[monthIndex] || '____';
        }
        return '____';
    }

    function findRefData(groupCode, practiceType) {
        const group = refData.groups.find(g => g.code.trim().toUpperCase() === groupCode.trim().toUpperCase());
        const modules = refData.modules.filter(m => 
            m.group_code.trim().toUpperCase() === groupCode.trim().toUpperCase() && 
            m.practice_type.trim().toUpperCase() === practiceType.trim().toUpperCase()
        );
        const calendarEntry = refData.calendar.find(c => 
            c.group_code.trim().toUpperCase() === groupCode.trim().toUpperCase() && 
            c.practice_type.trim().toUpperCase() === practiceType.trim().toUpperCase()
        );
        return { group, calendarEntry, modules };
    }

    async function generateDocuments() {
        if (excelData.length === 0) return;
        
        const genBtn = document.getElementById('btnGenerate');
        genBtn.disabled = true;
        statusLog.textContent = '⏳ Обработка данных и генерация документов...';
        downloadArea.classList.add('hidden');
        generatedZip = new JSZip();
        let successCount = 0;

        try {
            const t = Date.now();
            const app1Template = await (await fetch(`../templates/pp-app1.docx?t=${t}`)).arrayBuffer();
            const app2Template = await (await fetch(`../templates/pp-app2.docx?t=${t}`)).arrayBuffer();

            const groupedData = {};
            excelData.forEach(row => {
                const groupCode = String(row['Группа'] || '').trim().toUpperCase();
                const practiceType = String(row['Тип_практики'] || 'ПП').trim().toUpperCase();
                const orgName = String(row['названиеПО'] || 'Неизвестная организация').trim();
                const key = `${orgName}|${groupCode}|${practiceType}`;

                if (!groupedData[key]) {
                    const ref = findRefData(groupCode, practiceType);
                    groupedData[key] = { orgName, groupCode, practiceType, ref, students: [] };
                }

                groupedData[key].students.push({
                    fio: String(row['ФИО'] || 'Не указано').trim(),
                    birthdate: String(row['Дата рождения'] || '__.__.____').trim(),
                    должность_руководительПО: String(row['должность_руководительПО'] || 'Руководитель').trim(),
                    руководительПО_наставник_полностью: String(row['руководительПО_наставник_полностью'] || 'Не указано').trim(),
                    телефон_руководительПО_наставник: String(row['телефон_руководительПО_наставник'] || '').trim(),
                    ответственныйПО: String(row['ответственныйПО'] || 'Не указано').trim(),
                    ответственныйПО_телефон: String(row['ответственныйПО_телефон'] || '').trim(),
                    адресПО: String(row['адресПО'] || 'Адрес не указан').trim(),
                    помещение: String(row['помещение'] || 'Рабочее место').trim()
                });
            });

            for (const [key, data] of Object.entries(groupedData)) {
                const { orgName, groupCode, practiceType, ref, students } = data;
                const { group, calendarEntry, modules } = ref;

                const startDate = calendarEntry ? calendarEntry.start_date : 'дд.мм.гггг';
                const endDate = calendarEntry ? calendarEntry.end_date : 'дд.мм.гггг';
                
                const moduleNames = modules.map(m => `${m.pm_code} ${m.pm_name}`).join(', ');
                const totalHours = modules.reduce((sum, m) => sum + (parseInt(m.hours, 10) || 0), 0);
                
                // Собираем уникальных преподавателей из найденных модулей
                const uniqueInstructors = [];
                modules.forEach(m => {
                    if (m.instructor_fio && m.instructor_phone) {
                        const exists = uniqueInstructors.find(i => i.fio === m.instructor_fio);
                        if (!exists) uniqueInstructors.push({ fio: m.instructor_fio, phone: m.instructor_phone });
                    }
                });

                const inst1 = uniqueInstructors[0] || { fio: "", phone: "" };
                const inst2 = uniqueInstructors[1] || { fio: "", phone: "" };

                // Формируем красивую строку для шаблона (без лишних запятых, если руководитель один)
                let rukText = "";
                if (inst1.fio) rukText += `${inst1.fio}, т. ${inst1.phone}`;
                if (inst2.fio) rukText += `, ${inst2.fio}, т. ${inst2.phone}`;
                if (!rukText) rukText = "____________, т. ____________";

                const docData = {
                    модуль: moduleNames || 'Модуль не найден в справочнике',
                    день_начала: startDate.split('.')[0] || '__',
                    месяц_начала: getMonthInWords(startDate),
                    день_заверешения: endDate.split('.')[0] || '__',
                    месяц_заверешения: getMonthInWords(endDate),
                    год: startDate.split('.')[2] || '2026',
                    специальность: group ? `${group.spec_code} ${group.spec_name}` : 'Специальность не найдена',
                    часы: totalHours > 0 ? String(totalHours) : '0',
                    
                    названиеПО: orgName,
                    адресПО: students[0].адресПО || '____________',
                    помещение: students[0].помещение || '____________',
                    должность_руководительПО: students[0].должность_руководительПО || '____________',
                    
                    должность_наставникПО: students[0].руководительПО_наставник_полностью ? students[0].должность_руководительПО : '____________',
                    руководительПО_наставник_полностью: students[0].руководительПО_наставник_полностью || '____________',
                    телефон_руководительПО_наставник: students[0].телефон_руководительПО_наставник || '____________',
                    
                    ответственныйПО: students[0].ответственныйПО || '____________',
                    ответственныйПО_телефон: students[0].ответственныйПО_телефон || '____________',
                    
                    // Передаем и по отдельности (для совместимости), и единой строкой (для идеального вида)
                    руководительОО_первый_полностью: inst1.fio || '____________',
                    телефон_руководительОО_первый: inst1.phone || '____________',
                    руководительОО_второй_полностью: inst2.fio || '',
                    телефон_руководительОО_второй: inst2.phone || '',
                    руководители_ОО: rukText, // <-- ИСПОЛЬЗУЙТЕ ЭТУ ПЕРЕМЕННУЮ В ШАБЛОНЕ
                    
                    students: students
                };

                const safeOrgName = orgName.replace(/[^a-zа-яё0-9]/gi, '_').substring(0, 30);

                const zip1 = new PizZip(app1Template);
                const doc1 = new window.docxtemplater(zip1, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } });
                doc1.render(docData);
                generatedZip.file(`Приложение_1_${safeOrgName}_${groupCode}.docx`, doc1.getZip().generate({ type: 'blob' }));

                const zip2 = new PizZip(app2Template);
                const doc2 = new window.docxtemplater(zip2, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } });
                doc2.render(docData);
                generatedZip.file(`Приложение_2_${safeOrgName}_${groupCode}.docx`, doc2.getZip().generate({ type: 'blob' }));

                successCount++;
            }

            statusLog.textContent = `✅ Успешно сгенерировано документов для ${successCount} организаций/групп. Упаковка ZIP...`;
            const content = await generatedZip.generateAsync({ type: 'blob' });
            saveAs(content, `Приложения_к_договору_${new Date().toISOString().slice(0,10)}.zip`);
            statusLog.textContent = '🎉 Архив успешно скачан!';
            downloadArea.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            statusLog.textContent = `❌ Ошибка генерации: ${error.message}\nПроверьте консоль (F12) и наличие файлов pp-app1.docx / pp-app2.docx в папке templates/`;
        } finally {
            genBtn.disabled = false;
        }
    }

    if (btnDownloadZip) {
        btnDownloadZip.addEventListener('click', () => {
            if (!generatedZip) return;
            statusLog.textContent = '⏳ Повторная упаковка и скачивание...';
            generatedZip.generateAsync({ type: 'blob' }).then((content) => {
                saveAs(content, `Приложения_к_договору_${new Date().toISOString().slice(0,10)}.zip`);
                statusLog.textContent = '✅ Архив успешно скачан!';
            });
        });
    }
});
