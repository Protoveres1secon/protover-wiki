PROTOVERES MAIN WEB — COMMUNITY AUDITED BUILD

Base: Protoveres_Auth_Session_FINAL_FULL
Add-ons: Community UID search, member profile view, friend requests, notification badge/center, friends, 1-1 chat.
Profile sync: custom avatar and cover are stored in Firestore as avatarURL / coverURL.
Google profile data: googlePhotoURL is kept separately and does not overwrite a custom Protoveres avatar/name.

Important: publish firestore.rules in Firebase Console > Firestore Database > Rules.

Thu hoi tin nhan: chi cap nhat dung document cua tin nhan thanh revoked=true; khong xoa ca doan chat.
