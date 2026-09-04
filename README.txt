Protoveres Auth Session FINAL FULL — Chat Video Fix

Base: Protoveres_Auth_Session_FINAL_FULL_CHAT_AUDITED_REPAIRED

This build keeps the existing web and only adds/fixes chat video support and profile-cover persistence.

Changes:
- Profile cover is preserved when saving other profile fields instead of being overwritten by null.
- Chat adds a Video button with mobile camera capture support.
- Video upload limit: 100 MB per file (not a 30-second limit).
- Video is uploaded to Firebase Storage and shown with an HTML5 player.

Firebase:
- Publish firestore.rules only if you changed yours; it remains compatible with the current chat recall rules.
- Publish storage.rules in Firebase Storage -> Rules before sending videos.
