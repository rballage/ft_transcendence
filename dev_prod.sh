mkdir -p ~/goinfre/db_volume;
docker-compose -f ./docker-compose.yml up --build -d;
sleep 2;
prisma migrate dev -n update;
cd client && npx quasar build && cd ..;

nest start;