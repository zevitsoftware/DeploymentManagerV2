/**
 * src/main/ipc/aiHandlers.js
 * AI Config / Provider IPC handlers.
 *
 * Channels: ai:get-config, ai:save-config, ai:check-cli, ai:test
 */
'use strict'

const ch = require('../../shared/channels')
const { readFullConfig, writeFullConfig } = require('../services/configStore')
const { checkGeminiCliAvailability, analyze } = require('../services/aiProvider')

function registerAiHandlers(ipcMain) {

  ipcMain.handle(ch.AI_GET_CONFIG, () => {
    try {
      const cfg = readFullConfig()
      return {
        ok: true,
        config: {
          mode:             cfg.aiMode       ?? 'gemini-cli',
          model:            cfg.geminiCliModel ?? 'gemini-2.5-flash',
          groqKeys:         cfg.groqKeys      ?? [],
          geminiKeys:       cfg.geminiKeys    ?? [],
          cliReady:         checkGeminiCliAvailability().available,
        }
      }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(ch.AI_SAVE_CONFIG, (e, config) => {
    try {
      const cfg = readFullConfig()
      if (config.mode       !== undefined) cfg.aiMode          = config.mode
      if (config.model      !== undefined) cfg.geminiCliModel   = config.model
      if (config.groqKeys   !== undefined) cfg.groqKeys         = config.groqKeys
      if (config.geminiKeys !== undefined) cfg.geminiKeys       = config.geminiKeys
      writeFullConfig(cfg)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(ch.AI_CHECK_CLI, () => {
    try {
      const check = checkGeminiCliAvailability()
      return { ok: check.available, reason: check.reason }
    } catch (err) {
      return { ok: false, reason: err.message }
    }
  })

  ipcMain.handle(ch.AI_TEST, async (e, prompt) => {
    try {
      const result = await analyze(prompt ?? 'Reply with: AI is working correctly.', { maxTokens: 256 })
      return result
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}

module.exports = registerAiHandlers
