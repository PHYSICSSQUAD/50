import pathlib, base64

base = pathlib.Path('/home/user/src')
three = (base / 'three.min.js').read_text(encoding='utf-8')
tpl = (base / 'template.html').read_text(encoding='utf-8')
main = (base / 'main.js').read_text(encoding='utf-8')
logo_b64 = base64.b64encode((base / 'logo.png').read_bytes()).decode('ascii')

html = tpl.replace('/*__THREE_MIN_JS__*/', three) \
          .replace('/*__LOGO_B64__*/', logo_b64) \
          .replace('/*__MAIN_JS__*/', main)

out = pathlib.Path('/home/user/wooden-torch-3d.html')
out.write_text(html, encoding='utf-8')
print('written:', out, out.stat().st_size, 'bytes')
print('leftover markers:', html.count('__THREE_MIN_JS__') + html.count('__LOGO_B64__') + html.count('__MAIN_JS__'))
print('script tags:', html.count('<script>'), html.count('</script>'))
