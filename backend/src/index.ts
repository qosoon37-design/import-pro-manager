import 'dotenv/config'
import app from './app.js'

const PORT = parseInt(process.env.PORT || '4000', 10)

app.listen(PORT, () => {
  console.log(`🚀 ERP Inventory API running on http://localhost:${PORT}`)
  console.log(`📋 Environment: ${process.env.NODE_ENV}`)
})
