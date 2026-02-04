im using nextjs + tailwind
this is my .env.local

# Production Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBkOshAPuqhrKH7A9Ypz7UVISXP4jqmq_8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=evals-79b08.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=evals-79b08
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=evals-79b08.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=629006425607
NEXT_PUBLIC_FIREBASE_APP_ID=1:629006425607:web:0faf7daff7272ace03d4a2

i want to create an app that helps our evaluation prcoess
i want to use firebase authentication to authenticate users
only @goabroad.com users are allowed to login
i want to have 3 types of users. Admin, Manager, Employee

The admin can create Questions.
    There are two types of questions
        1. Answerable by the scale of 1-10
        2. Answerable in a paragraph

There will be 3 types of evaluations
    Peer to peer
    Manager to employee
    Employee to manager

Admin can assign which people will be evaluated by whom.
        
Users can then answer the questions for the people assigned to them.
Users also will answer the same set of questions for themselves.

THe admin can view the evalusations of all users.