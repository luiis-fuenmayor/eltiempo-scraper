# 🚀 El Tiempo Edictos Scraper

Scraper robusto para edictos y avisos legales desde **eltiempo.com.co** basado en HTTP puro (axios).

## ✨ Características

- ✅ **HTTP puro** - Sin Puppeteer, sin Playwright, sin navegadores
- ✅ **Modular** - Servicios separados para API, BD y Jobs
- ✅ **Robusto** - Manejo de errores, retry con backoff exponencial
- ✅ **Eficiente** - SQLite con UPSERT para evitar duplicados
- ✅ **Scheduled** - Cron automático a las 06:00 AM UTC diarios
- ✅ **Escalable** - Paginación automática, logging completo

## 📋 Requisitos

- Node.js 20+
- npm o yarn

## 🛠️ Instalación

```bash
git clone https://github.com/luiis-fuenmayor/eltiempo-edictos-scraper.git
cd eltiempo-edictos-scraper
npm install
npm run build
```

## 📖 Uso

### Backfill (60 días por defecto)
```bash
npm run backfill
```

### Backfill personalizado (N días)
```bash
npm run backfill-custom 30
```

### Cron scheduler (se ejecuta diariamente a las 06:00 AM UTC)
```bash
npm run cron
```

### Ejecutar cron una sola vez
```bash
npm run cron-once
```

## ⚙️ Configuración

Copia `.env.example` a `.env` y ajusta:

```bash
cp .env.example .env
```

Variables disponibles:
- `DB_PATH` - Ruta a la BD SQLite (default: `./edictos.db`)
- `LOG_LEVEL` - Nivel de logs: debug, info, warn, error (default: `info`)

## 📊 Base de Datos

La BD se crea automáticamente en `./edictos.db` con la siguiente estructura:

```sql
CREATE TABLE edictos (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  customer TEXT,
  category TEXT,
  url TEXT,
  date TEXT,
  content_hash TEXT,
  scraped_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### Deduplicación
- Clave primaria: `id`
- Hash de contenido: `content_hash` (SHA256 del body)
- UPSERT automático para evitar duplicados

## 🔄 Cron Automático

Para ejecutar el scraper automáticamente cada día a las 06:00 AM UTC:

### Linux/Mac
```bash
# En crontab
@reboot cd /path/to/scraper && npm run cron > /tmp/edictos-cron.log 2>&1 &
```

### Systemd (recomendado)
```ini
# /etc/systemd/system/edictos-scraper.service
[Unit]
Description=El Tiempo Edictos Scraper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/eltiempo-edictos-scraper
ExecStart=/usr/bin/node /opt/eltiempo-edictos-scraper/dist/main.js cron
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Luego:
```bash
sudo systemctl enable edictos-scraper
sudo systemctl start edictos-scraper
sudo journalctl -u edictos-scraper -f  # Ver logs
```

## 📈 Estadísticas

Basadas en validación experimental (FASE 5.5):

| Métrica | Valor |
|---------|-------|
| Registros por página | 10 |
| Total de páginas | 147 |
| Total de edictos | ~1470 |
| Velocidad | 200-500ms por página |
| Tiempo backfill 60 días | ~15 segundos |

## 🔍 Debugging

### Ver logs detallados
```bash
LOG_LEVEL=debug npm run cron-once
```

### Inspeccionar BD
```bash
sqlite3 edictos.db
sqlite> SELECT COUNT(*) FROM edictos;
sqlite> SELECT * FROM edictos LIMIT 5;
```

## 🏗️ Arquitectura

```
src/
├── config/
│   └── constants.ts        # Configuración centralizada
├── services/
│   ├── api.service.ts      # Cliente HTTP con retry
│   └── database.service.ts # SQLite con UPSERT
├── jobs/
│   ├── backfill.job.ts     # Backfill inicial (60 días)
│   └── cron.job.ts         # Cron diario (2 días)
├── utils/
│   └── logger.ts           # Logger con colores
└── main.ts                 # CLI entry point
```

## 📝 API Descubierta

Endpoint: `https://edictos.eltiempo.com/api/v1/edicts`

Parámetros:
- `sort_by=published` (requerido)
- `page=N` (opcional, default: 1)
- `filter=categoria` (opcional)
- `date_from=YYYY-MM-DD` (opcional)
- `date_to=YYYY-MM-DD` (opcional)
- `search=texto` (opcional)

Respuesta:
```json
{
  "rows": [
    {
      "id": "26293659",
      "title": "EDICTO.",
      "body": "...",
      "customer": "NOMBRE",
      "category": "Edicto",
      "url": "/anuncio/26293659",
      "date": "2026/06/17"
    }
  ],
  "current_page": 1,
  "total_pages": 147,
  "items_per_page": 10,
  "total_items": 1470
}
```

## 🧪 Validación Experimental

Se realizó validación exhaustiva (FASE 5.5) comparando:
- Respuestas via Puppeteer (referencia)
- Respuestas via Axios HTTP puro

**Resultado:** 100% reproducible sin navegador. No se detectaron:
- Cookies dinámicas
- Tokens de sesión
- Headers firmados
- Degradación de datos

## 📄 Licencia

MIT

## 👨‍💻 Autor

Luis Fernando Fuenmayor - luiis-fuenmayor
