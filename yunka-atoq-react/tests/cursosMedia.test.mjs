import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('cursos online: enlaces embebibles, visor de Office y tamaños de archivo', async t => {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
  t.after(() => server.close());
  const { urlEmbebida, visorOffice, tamanoArchivo } = await server.ssrLoadModule('/src/utils/cursosMedia.ts');

  const yt = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com/embed/dQw4w9WgXcQ'])
    assert.equal(urlEmbebida(u), yt, u);
  assert.equal(urlEmbebida('https://vimeo.com/76979871'), 'https://player.vimeo.com/video/76979871');
  assert.equal(urlEmbebida('https://drive.google.com/file/d/1AbCdEfGhIj/view?usp=sharing'), 'https://drive.google.com/file/d/1AbCdEfGhIj/preview');
  assert.equal(urlEmbebida('https://ejemplo.com/video'), null);
  assert.equal(urlEmbebida('https://www.youtube.com/watch?v=<script>'), null);
  assert.equal(urlEmbebida('no es url'), null);

  const archivo = 'https://bomberosatoq.org/api/cursos/archivo/abc.def/material-3.pptx';
  assert.equal(visorOffice(archivo), `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(archivo)}`);
  assert.equal(visorOffice('http://localhost:3001/api/cursos/archivo/x/material-1.pptx'), null);
  assert.equal(visorOffice('https://192.168.1.10/api/x.pptx'), null);

  assert.equal(tamanoArchivo(0), '');
  assert.equal(tamanoArchivo(500), '1 KB');
  assert.equal(tamanoArchivo(5.5 * 1024 * 1024), '5.5 MB');
  assert.equal(tamanoArchivo(250 * 1024 * 1024), '250 MB');
});
