import zipfile
import re
import os
import shutil

def fix_docx(filepath):
    if not os.path.exists(filepath):
        print(f"❌ Файл {filepath} не найден!")
        return

    backup = filepath + '.bak2'
    if not os.path.exists(backup):
        shutil.copy(filepath, backup)
        print(f"💾 Создана резервная копия: {backup}")

    with zipfile.ZipFile(filepath, 'r') as zin:
        file_data = {}
        for item in zin.infolist():
            if item.filename == 'word/document.xml':
                xml_content = zin.read(item).decode('utf-8')
                
                def clean_tags(match):
                    text = match.group(0)
                    # Удаляем ВСЕ вариации разрывов текстовых блоков Word внутри {{ }}
                    text = re.sub(r'</w:t>[\s\S]*?<w:t[^>]*>', '', text)
                    return text

                # re.DOTALL позволяет точке захватывать переносы строк
                fixed_xml = re.sub(r'\{\{.*?\}\}', clean_tags, xml_content, flags=re.DOTALL)
                file_data[item] = fixed_xml.encode('utf-8')
            else:
                file_data[item] = zin.read(item)

    with zipfile.ZipFile(filepath, 'w') as zout:
        for item, data in file_data.items():
            zout.writestr(item, data)
            
    print(f"✅ Файл {filepath} успешно исправлен!")

print("🔧 Начинаю глубокое исправление шаблонов...")
fix_docx('templates/pp-app1.docx')
fix_docx('templates/pp-app2.docx')
print("🎉 Готово! Шаблоны полностью очищены от мусорных тегов Word.")
