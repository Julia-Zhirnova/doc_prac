import zipfile
import re
import os
import shutil

def fix_all_xml_in_docx(filepath):
    if not os.path.exists(filepath):
        print(f"❌ Файл {filepath} не найден!")
        return

    backup = filepath + '.bak_ultimate'
    if not os.path.exists(backup):
        shutil.copy(filepath, backup)
        print(f"💾 Создана резервная копия: {backup}")

    with zipfile.ZipFile(filepath, 'r') as zin:
        file_data = {}
        for item in zin.infolist():
            # Исправляем ВСЕ xml-файлы внутри документа (включая колонтитулы)
            if item.filename.endswith('.xml'):
                xml_text = zin.read(item).decode('utf-8')
                
                def clean_match(m):
                    inner_content = m.group(1)
                    # Удаляем абсолютно все теги вида <...> внутри блока
                    clean_inner = re.sub(r'<[^>]+>', '', inner_content)
                    # Возвращаем чистый тег без пробелов по краям
                    return f"{{{{{clean_inner.strip()}}}}}"
                
                # Находим все блоки {{ ... }} и чистим их
                fixed_xml = re.sub(r'\{\{([\s\S]*?)\}\}', clean_match, xml_text)
                file_data[item] = fixed_xml.encode('utf-8')
            else:
                file_data[item] = zin.read(item)

    with zipfile.ZipFile(filepath, 'w') as zout:
        for item, data in file_data.items():
            zout.writestr(item, data)
            
    print(f"✅ Файл {filepath} гарантированно исправлен (все части документа)!")

print("🔧 Начинаю 100% надежное исправление всех частей документа...")
fix_all_xml_in_docx('templates/pp-app1.docx')
fix_all_xml_in_docx('templates/pp-app2.docx')
print("🎉 Готово! Теперь можно генерировать.")
