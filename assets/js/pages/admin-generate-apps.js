// Функция для получения данных графика для конкретной группы и типа практики
async function getScheduleForGroup(group, practiceType) {
    try {
        // Загружаем актуальный график из JSON файла
        const response = await fetch('../data/schedule.json');
        if (!response.ok) throw new Error('Не удалось загрузить schedule.json');
        const scheduleData = await response.json();
        
        // Ищем запись, совпадающую по группе и типу практики (УП или ПП)
        // Приводим к нижнему регистру для надежного сравнения
        const record = scheduleData.find(row => 
            row.group.trim().toLowerCase() === group.trim().toLowerCase() && 
            row.type.trim().toLowerCase() === practiceType.trim().toLowerCase()
        );

        if (record) {
            return {
                modules: record.module, // Теперь здесь строка вида "ПМ.08..., ПМ.13..."
                d_start: record.d_start,
                m_start: record.m_start,
                d_end: record.d_end,
                m_end: record.m_end,
                year: record.year,
                specialty: record.spec,
                hours: record.hours
            };
        }

        // Запасной вариант, если запись не найдена
        console.warn(`График для ${group} (${practiceType}) не найден в schedule.json`);
        return {
            modules: "Модуль не указан в графике",
            d_start: "__", m_start: "______", d_end: "__", m_end: "______", year: "2026",
            specialty: "Специальность не указана",
            hours: "0"
        };
    } catch (error) {
        console.error("Ошибка загрузки расписания:", error);
        return {
            modules: "Ошибка загрузки графика",
            d_start: "__", m_start: "______", d_end: "__", m_end: "______", year: "2026",
            specialty: "Ошибка",
            hours: "0"
        };
    }
}
