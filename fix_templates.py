import zipfile
import re
import os
import shutil

def fix_docx(filepath):
    if not os.path.exists(filepath):
        print(f"❌ Файл {filepath} не найден!")
        return

    backup = filepath + '.bak'
    if not os.path.exists(backup):
        shutil.copy(filepath, backup)
        print(f"💾 Создана резервная копия: {backup}")

    # 1. Читаем весь архив в память
    with zipfile.ZipFile(filepath, 'r') as zin:
        file_data = {}
        for item in zin.infolist():
            if item.filename == 'word/document.xml':
                xml_content = zin.read(item).decode('utf-8')
                
                # Функция для очистки разорванных тегов внутри {{ }}
                def clean_tags(match):
                    text = match.group(0)
                    # Удаляем стандартные разрывы текстовых блоков Word внутри плейсхолдера
                    text = re.sub(r'</w:t>\s*</w:r>\s*<w:r>\s*<w:t>', '', text)
                    return text

                # Ищем все последовательности, начинающиеся с {{ и заканчивающиеся }}
                fixed_xml = re.sub(r'\{\{.*?\}\}', clean_tags, xml_content, flags=re.DOTALL)
                file_data[item] = fixed_xml.encode('utf-8')
            else:
                file_data[item] = zin.read(item)

    # 2. Перезаписываем архив исправленными данными
    with zipfile.ZipFile(filepath, 'w') as zout:
        for item, data in file_data.items():
            zout.writestr(item, data)
            
    print(f"✅ Файл {filepath} успешно исправлен!")

print("🔧 Начинаю исправление шаблонов...")
fix_docx('templates/pp-app1.docx')
fix_docx('templates/pp-app2.docx')
print("🎉 Готово! Теперь можно запускать генерацию.")
