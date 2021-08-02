const { test, expect, describe, beforeEach } = require('@jest/globals')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../app')
const jwt = require('jsonwebtoken')
const Blog = require('../models/blog')
const User = require('../models/user')
const { handlePotentialSyntaxError } = require('@jest/transform')
const initialBlogs = [
  { _id: "5a422a851b54a676234d17f7", title: "React patterns", author: "Michael Chan", url: "https://reactpatterns.com/", likes: 7, __v: 0,},
  // { _id: "5a422aa71b54a676234d17f8", title: "Go To Statement Considered Harmful", author: "Edsger W. Dijkstra", url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html", likes: 5, __v: 0 },
  // { _id: "5a422b3a1b54a676234d17f9", title: "Canonical string reduction", author: "Edsger W. Dijkstra", url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html", likes: 12, __v: 0 },
  // { _id: "5a422b891b54a676234d17fa", title: "First class tests", author: "Robert C. Martin", url: "http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.htmll", likes: 10, __v: 0 },
  // { _id: "5a422ba71b54a676234d17fb", title: "TDD harms architecture", author: "Robert C. Martin", url: "http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html", likes: 0, __v: 0 },
  // { _id: "5a422bc61b54a676234d17fc", title: "Type wars", author: "Robert C. Martin", url: "http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html", likes: 2, __v: 0 }
]

let token

//const token = 
// .set({ Authorization: token })
beforeEach(async () => {
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('secret', 10)
  const user = new User({ username: 'root', name: 'User', password: passwordHash })

  await user.save()

  const userForToken = {
      username: user.username,
      id: user.id,
  }
  token = jwt.sign(userForToken, process.env.SECRET)

  await Blog.deleteMany({})
  blogs = initialBlogs.map(blog => new Blog({ ...blog, user: user.id }))
  await Blog.insertMany(initialBlogs)
})



const api = supertest(app)
describe('testing blogs', () => {
test('get return json format', async () => {

    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  }, 100000)

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')
  
    expect(response.body).toHaveLength(initialBlogs.length)
  }, 100000)
  
  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs')
    const contents = response.body.map(r => r.title)
    expect(contents).toContain(
      'React patterns'
      )
    }, 100000)
    
  test('identifying field is named id', async () => {
    const response = await api.get('/api/blogs')
    expect(response.body[0].id).toBeDefined()
  }, 100000)

  test('post is adding blog to the database', async () => {
    const blog = { title: "The new post", author: "Robert", url: "http://test.com/test.html", likes: 2 }
    await api
      .post('/api/blogs')
      .send(blog).set('Authorization', `bearer ${token}`)

    const response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(initialBlogs.length + 1)
  }, 100000)
  
  test('if no likes set likes to 0', async () => {
    const blog = { title: "NO likes", author: "Robertest123", url: "http://test.com/test.html" }
    const response = await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(blog)
    expect(response.body.likes).toBe(0)
  }, 100000)

  test('if no title return status 400', async () => {
    const blog = { author: "Robertest123", url: "http://test.com/test.html" }
    const response = await api
    .post('/api/blogs')
    .set('Authorization', `bearer ${token}`)
    .send(blog)
    expect(response.status).toBe(400)
  }, 100000)

  test('if no url return status 400', async () => {
    const blog = { title: "NO likes", author: "Robertest123"}
    const response = await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(blog)
    expect(response.status).toBe(400)
  }, 100000)

})

describe('testing users api', () => {

  

  test('creation of new user with new username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'test',
      name: 'moses',
      password: 'toor'
    }

    await api.post('/api/users').send(newUser).expect(200)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)

  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('`username` to be unique')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with prtoper statuscode and message if username is shorter than 3', async () => {
    const newUser = {
      username: 'ro',
      name: 'Superuse',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('too short')
  })


})


afterAll(() => {
  mongoose.connection.close()
})