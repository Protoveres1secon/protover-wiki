Protoveres Social Posts - fixed build

Base: working Protoveres social/community/chat build.

Post creation:
- text only
- image only
- text + image
- public/private visibility
- like / heart / share
- jump to newly created post

IMPORTANT:
Publish Protoveres_Final/firestore.rules in Firebase Firestore -> Rules.
The post create operation requires the /posts rule included in this file.
Do not use an older rules file that only covers users/chat.
