import zipfile
import re
import os
import shutil

def fix_docx_guaranteed(filepath):
    if not os.path.exists(filepath):
        print(f"❌ Файл {filepath} не найден!")
        return

    backup = filepath + '.bak_final'
    if not os.path.exists(backup):
        shutil.copy(filepath, backup)
        print(f"💾 Создана резервная копия: {backup}")

    with zipfile.ZipFile(filepath, 'r') as zin:
        file_data = {}
        for item in zin.infolist():
            if item.filename == 'word/document.xml':
                xml_text = zin.read(item).decode('utf-8')
                
                # Функция, которая находит всё между {{ и }} и удаляет оттуда ВСЕ XML-теги
                def clean_match(m):
                    inner_content = m.group(1)
                    # Удаляем абсолютно все теги вида <...> внутри блока
                    clean_inner = re.sub(r'<[^>]+>', '', inner_content)
                    # Возвращаем чистый тег без пробелов по краям
                    return f"{{{{{clean_inner.strip()}}}}}"
                
                # Находим все блоки {{ ... }} (нежадный поиск, включая переносы строк)
                fixed_xml = re.sub(r'\{\{([\s\S]*?)\}\}', clean_match, xml_text)
                
                file_data[item] = fixed_xml.encode('utf-8')
            else:
                file_data[item] = zin.read(item)

    with zipfile.ZipFile(filepath, 'w') as zout:
        for item, data in file_data.items():
            zout.writestr(item, data)
            
    print(f"✅ Файл {filepath} гарантированно исправлен!")

print("🔧 Начинаю 100% надежное исправление шаблонов...")
fix_docx_guaranteed('templates/pp-app1.docx')
fix_docx_guaranteed('templates/pp-app2.docx')
print("🎉 Готово! Все теги {{ }} внутри документов теперь абсолютно чистые.")
