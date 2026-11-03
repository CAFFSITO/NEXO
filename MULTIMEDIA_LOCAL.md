# Multimedia privado en NEXO

El estudio multimedia permite grabar voz, cámara, pantalla o pantalla con cámara; pausar y reanudar; recuperar el último borrador en IndexedDB; marcar capítulos; recortar; y adjuntar el resultado a lecciones, tareas o archivos privados. Al usar una grabación en una lección, sus capítulos se guardan con la estructura y aparecen como saltos en el reproductor publicado; también pueden descargarse como JSON desde el borrador. La captura se realiza con `MediaRecorder` del navegador y requiere permiso del usuario. La duración y compatibilidad dependen del navegador y de los dispositivos disponibles.

## Procesamiento institucional

- El recorte y las métricas acústicas usan `ffmpeg` en el host institucional (`NEXO_FFMPEG`, o `ffmpeg` en el PATH). El servidor limita los archivos a 100 MB y borra los temporales al terminar.
- La transcripción requiere `whisper.cpp` instalado por la institución. Configurar `NEXO_WHISPER_CLI` con la ruta al ejecutable `whisper-cli` y `NEXO_WHISPER_MODELO` con la ruta a un modelo local compatible. Si falta alguno, la API responde 503 y el archivo grabado sigue disponible.
- Cuando whisper.cpp está disponible, la transcripción local produce texto y segmentos SRT con tiempo de inicio y fin. El docente puede corregir cada segmento antes de adjuntarlo a una lección. En una lección publicada, los videos muestran subtítulos WebVTT y los audios ofrecen una lista sincronizada que permite saltar al momento elegido. La transcripción completa editable y los segmentos se corrigen por separado; editar una no reescribe automáticamente la otra. Un recorte invalida la transcripción y los subtítulos previos para evitar marcas de tiempo incorrectas.
- Ninguna de estas rutas llama a servicios de IA externos ni usa el audio para entrenar modelos externos. Los archivos adjuntados se almacenan en el servicio de archivos de NEXO, según la configuración del servidor institucional.
- El borrador recuperable se guarda en IndexedDB del navegador para esa cuenta y origen; puede desaparecer si el usuario borra datos locales. Conviene descargar una copia o adjuntarla.

Las métricas muestran palabras y ritmo estimados a partir de una transcripción editable, pausas y nivel de audio medidos en el archivo, y luz/cambio de los cuadros que se reprodujeron en el navegador. Las señales de estructura cuentan expresiones de apertura, conectores, ejemplos y cierre en el texto editado; no comprueban que el discurso tenga una buena estructura. El análisis visual es técnico y no detecta postura, mirada, emociones ni calidad de oratoria. Ninguna métrica es un diagnóstico o una puntuación de la persona. El umbral de pausa por defecto es -35 dBFS durante 0,5 segundos.

Los tests comprueban la lectura SRT, persistencia y permisos de subtítulos en lecciones. No se probó una transcripción real en este entorno porque no hay modelo Whisper instalado.
