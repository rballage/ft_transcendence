import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'adeburea',
	  email: 'adeburea@student.42.fr',
  },
  {
    name: 'rballage',
    email: 'rballage@student.42.fr',
  },
  {
	  name: 'tharchen',
	  email: 'tharchen@student.42.fr',
  },
  {
	  name: 'leCaca',
	  email: 'leCaca@student.42.fr',
  },
]

async function main() {
  console.log(`Start seeding ...`)
  for (const u of userData) {
	try {
		const user = await prisma.user.create({
			data: u,
		})
		console.log(`Created user with name:  ${user.name}`)
	} catch (error) {
		
	}

  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
