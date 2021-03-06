import request from 'request'
import {
  TickProject,
  Inbox
} from './modules/tickProject'
import {
  TickProjectGroup,
  TickNoGroup
} from './modules/tickProjectGroup'
import TickTag from './modules/tickTag'
import TickTask from './modules/tickTask';

export default class TickApi {
  constructor (username, password, options) {
    this.request = request.defaults({
      'jar': true
    })
    this.username = username
    this.options = options
    this.isLogin = false
    this.token = null
    this.init()
    this.baseUrl =
      (this.options.site === 'dida365')
      ? 'https://api.dida365.com'
      : 'https://ticktick.com'
    return new Promise((resolve, reject) => {
      this.login(username, password)
        .then(async () => {
          this.isLogin = true
          resolve(this)
        })
    })
  }

  init () {
    this.user = {
      id: null,
      inbox: null,
      projects: [],
      projectGroups: [],
      tags: [],
      allTasks: [],
      pro: {
        status: false,
        endDate: null
      }
    }
  }
  
  login (username, password) {
    const url = this.baseUrl + '/api/v2/user/signon?wc=true&remember=true'
    const reqOptions = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.baseUrl
      },
      json: {
        username: username,
        password: password
      }
    }
    var _this = this
    return new Promise((resolve, reject) => {
      this.request(reqOptions, function (error, request, body) {
        if (body.username !== undefined) {
          if (body.token) _this.token = body.token
          if (body.userId) _this.user.id = body.userId
          if (body.inboxId) _this.user.inbox = body.inboxId
          if (body.pro) _this.user.pro.status = body.pro
          if (body.proEndDate) _this.user.pro.endDate = new Date(body.proEndDate)
          resolve(_this)
        } else {
          throw new Error('Could not login')
        }
      })
    })
  }

  getUserProfile () {
    const url = this.baseUrl + '/api/v2/user/status'
    const reqOptions = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.baseUrl
      }
    }
    var _this = this
    return new Promise((resolve, reject) => {
      this.request(reqOptions, function (error, request, body) {
        if (error) reject(error)
        var data = JSON.parse(body)
        if (data.userId) _this.user.id = data.userId
        if (data.inboxId) _this.user.inbox = data.inboxId
        if (data.pro) _this.user.pro.status = data.pro
        if (data.proEndDate) _this.user.pro.endDate = new Date(data.proEndDate)
        resolve(_this)
      })
    })
  }

  update () {
    const url = this.baseUrl + '/api/v2/batch/check/0'
    const reqOptions = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.baseUrl
      }
    }
    var _this = this
    return new Promise((resolve, reject) => {
      this.request(reqOptions, function (error, request, body) {
        var data = JSON.parse(body)
        if (data.projectGroups) {
          for (var group of data.projectGroups) {
            _this.user.projectGroups.push(new TickProjectGroup(group.name, group))
          }
        }
        _this.user.projectGroups.push(new TickNoGroup())
        if (data.projectProfiles) {
          for (var project of data.projectProfiles) {
            _this.user.projects.push(new TickProject(project.name, project))
          }
        }
        var inbox = new Inbox(_this.user.inbox)
        _this.user.projects.push(inbox)
        if (data.tags) {
          for (var tag of data.tags) {
            _this.user.tags.push(new TickTag(tag.name, tag))
          }
        }
        if (data.syncTaskBean.update) {
          for (var task of data.syncTaskBean.update) {
            _this.user.allTasks.push(new TickTask(task))
          }
        }
        for (var group of _this.user.projectGroups) {
          if (group.id) {
            group.projects = _this.user.projects.filter(project => project.property.groupId === group.id)
          } else {
            group.projects = _this.user.projects.filter(project => project.property.groupId === null)
          }
        }
        for (var project of _this.user.projects) {
          project.tasks = _this.user.allTasks.filter(task => task.projectId === project.id)
        }
        resolve(_this)
      })
    })
  }
}