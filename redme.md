# Group Discussion Simulator

A real-time 3D simulation of a campus placement Group Discussion featuring multiple AI participants.

## Features
- Continuous AI discussion loop
- Queued user interruptions
- 3D ReadyPlayerMe avatars

## Architecture
- Native WebSockets for duplex client-server messaging
- React Event Bus for audio synchronization

## Setup
1. Install dependencies: npm install
2. Run server: node server.cjs

## Pre-generation Pipeline
To minimize latency, the next speaker's text and audio are pre-generated in the background while the current speaker is talking.

## Interruption Mechanics
If the user speaks or types, the interruption is queued on the server, allowing the AI to finish naturally before granting the floor.

## Seating & Eye Contact
Contains a 6-seat table geometry with the 6th seat reserved for the USER, directing all AI gaze targeting to seat 5.

## Troubleshooting
Check EdgeTTS dependencies if voice files fail to generate.

## Customizations
Modify voice maps in server.cjs to add custom speakers.

## License
MIT License. See LICENSE for details.

