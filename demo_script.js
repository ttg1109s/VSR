// demo_script.js
// THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động
// Scenario format v1; authored against scenario.schema.json.
export const DEMO_SCRIPT = {
  "formatVersion": 1,
  "meta": {
    "title": "THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động",
    "subtitle": "Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại",
    "desc": "Bạn tỉnh dậy tại một ngôi làng phủ sương, nơi loa phát thanh gọi tên những người đã biến mất. Khám phá tám địa điểm, đối chiếu lời khai và quyết định liệu sự thật có nên được đánh thức.",
    "writer": "VSR Demo Team",
    "studio": "VSR",
    "version": "1.0.0",
    "language": "vi",
    "ageRating": "16+",
    "tags": [
      "mystery",
      "psychological-horror",
      "investigation",
      "puzzle"
    ],
    "difficulty": "normal",
    "estimatedPlayTime": 55,
    "entryScene": "scene_garden",
    "entryCharacter": "player",
    "createdAt": "2026-11-15T00:00:00.000Z",
    "updatedAt": "2026-11-15T00:00:00.000Z",
    "copyright": "Original demo scenario for VSR Engine",
    "license": "UNLICENSED",
    "notes": "Demo full-scale. The scene_garden ID is retained for compatibility with the canonical demo regression assertion."
  },
  "globalStates": {
    "clue_lantern": {
      "type": "boolean",
      "value": false
    },
    "heard_bell": {
      "type": "boolean",
      "value": false
    },
    "found_guestbook": {
      "type": "boolean",
      "value": false
    },
    "knows_twelve": {
      "type": "boolean",
      "value": false
    },
    "trust_mai": {
      "type": "number",
      "value": 0
    },
    "truth_fragments": {
      "type": "number",
      "value": 0
    },
    "village_timer": {
      "type": "number",
      "value": 0
    },
    "final_choice": {
      "type": "string",
      "value": "undecided"
    }
  },
  "templates": {
    "requirements": {
      "lantern_clue": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      },
      "enough_truth": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          }
        ]
      }
    },
    "effects": {
      "reveal_clue": [
        {
          "type": "notify",
          "subtype": "toast",
          "level": "success",
          "text": "Một mảnh ký ức vừa được khôi phục."
        }
      ],
      "warning": [
        {
          "type": "notify",
          "subtype": "toast",
          "level": "warn",
          "text": "Sương đang dày lên. Thời gian ở lại không còn nhiều."
        }
      ]
    },
    "automation": {
      "fog_cycle": {
        "set": {
          "move": "step_by_step",
          "moveDirection": "first",
          "numberCycleAllow": 3,
          "countCurrent": 0,
          "runInfinity": false,
          "banClick": false
        },
        "plan": [
          {
            "seconds": 20,
            "effect": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "warn",
                "text": "Sương phủ kín con đường phía Bắc."
              }
            ]
          },
          {
            "seconds": 20,
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "village_timer",
                "value": 1
              }
            ]
          },
          {
            "seconds": 20,
            "effect": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "danger",
                "text": "Loa phát thanh rè lên: 'Đừng trả lời khi nghe gọi tên'."
              }
            ]
          }
        ]
      }
    }
  },
  "itemInfo": {
    "lantern": {
      "name": "Đèn bão",
      "icon": "lantern",
      "desc": "Chiếu sáng những dấu vết chỉ xuất hiện trong sương.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_lantern",
            "value": true
          }
        ]
      }
    },
    "guestbook": {
      "name": "Sổ khách",
      "icon": "menu_book",
      "desc": "Cuốn sổ ghi lại những người chưa rời khỏi làng.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    },
    "tape": {
      "name": "Cuộn băng",
      "icon": "cassette",
      "desc": "Bản ghi âm đêm mất điện.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    },
    "red_umbrella": {
      "name": "Ô đỏ",
      "icon": "umbrella",
      "desc": "Vật chứng xuất hiện trong lời kể của Mai.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    },
    "bell_clapper": {
      "name": "Quả lắc chuông",
      "icon": "notifications",
      "desc": "Bộ phận bị tháo khỏi tháp chuông.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    },
    "class_photo": {
      "name": "Ảnh lớp",
      "icon": "photo",
      "desc": "Bức ảnh có một học sinh bị cắt khỏi khung.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    },
    "archive_key": {
      "name": "Chìa khóa kho hồ sơ",
      "icon": "key",
      "desc": "Chìa khóa mở tủ hồ sơ dưới đê.",
      "usage": {
        "current": 5,
        "max": 5,
        "autoInc": false
      }
    },
    "map_fragment": {
      "name": "Mảnh bản đồ",
      "icon": "map",
      "desc": "Mảnh giấy vẽ lối xuống đường hầm.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      }
    }
  },
  "passwords": {
    "number": {
      "pw_bell": {
        "desc": "Mã thời điểm chuông ngừng ngân: bốn chữ số khắc dưới mặt đồng hồ.",
        "display": "keyboard",
        "value": "0417",
        "retryMax": 5
      }
    },
    "string": {
      "pw_guest": {
        "desc": "Từ khóa được tạo bởi chữ đầu của bốn dòng thánh ca.",
        "value": "IMLANG",
        "hint": [
          0,
          2
        ],
        "retryMax": 4
      }
    },
    "find_way": {
      "pw_forest": {
        "desc": "Tìm đường từ cổng rừng tới khoảng đất trống, chỉ đi theo các ô liền kề.",
        "area": [
          4,
          4
        ],
        "start": [
          0,
          0
        ],
        "target": [
          3,
          3
        ],
        "street": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            2,
            1
          ],
          [
            2,
            2
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ]
        ],
        "retryMax": 3
      }
    },
    "puzzle": {
      "pw_photo": {
        "desc": "Ghép lại bức ảnh gia đình bị xé.",
        "url": "assets/puzzles/silent-village-family.jpg",
        "ratio": [
          3,
          2
        ],
        "level": "normal",
        "retryMax": 3
      }
    },
    "switch": {
      "pw_switch": {
        "desc": "Đặt bốn công tắc theo thứ tự đèn trên sơ đồ lớp học.",
        "value": "1010",
        "retryMax": 4
      }
    }
  },
  "scenes": {
    "scene_garden": {
      "meta": {
        "title": "Quảng trường Mù Sương",
        "desc": "Trái tim của ngôi làng, nơi chiếc loa phát thanh vẫn gọi tên những người đã mất."
      },
      "set": {
        "activeRouterId": "square_gate"
      },
      "routers": {
        "square_gate": {
          "meta": {
            "sceneID": "scene_garden",
            "desc": "Cổng làng và bảng thông báo"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_read_notice",
            "act_talk_mai"
          ]
        },
        "square_well": {
          "meta": {
            "sceneID": "scene_garden",
            "desc": "Giếng đá phủ rêu, tiếng gõ vọng lên từ lòng giếng"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_inspect_well",
            "act_use_lantern"
          ],
          "loop": {
            "enter": [
              {
                "type": "effect",
                "ref": "reveal_clue"
              }
            ]
          }
        }
      }
    },
    "scene_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "desc": "Mùi trà nguội và những căn phòng luôn được dọn sẵn cho khách chưa từng đến."
      },
      "set": {
        "activeRouterId": "inn_lobby"
      },
      "routers": {
        "inn_lobby": {
          "meta": {
            "sceneID": "scene_inn",
            "desc": "Quầy lễ tân"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_question_hanh",
            "act_open_guestbook"
          ],
          "loop": {
            "still": [
              {
                "type": "effect",
                "ref": "warning"
              }
            ]
          }
        },
        "inn_cellar": {
          "meta": {
            "sceneID": "scene_inn",
            "desc": "Hầm rượu bị khóa"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_unlock_cellar",
            "act_search_cellar"
          ]
        }
      }
    },
    "scene_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "desc": "Chuông đã ngừng ngân từ mười bảy năm trước, nhưng mỗi đêm vẫn có người nghe thấy."
      },
      "set": {
        "activeRouterId": "chapel_nave"
      },
      "routers": {
        "chapel_nave": {
          "meta": {
            "sceneID": "scene_chapel",
            "desc": "Gian cầu nguyện"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_read_hymn",
            "act_talk_keeper"
          ]
        },
        "chapel_tower": {
          "meta": {
            "sceneID": "scene_chapel",
            "desc": "Tháp chuông"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_solve_bell",
            "act_ring_bell"
          ],
          "loop": {
            "enter": [
              {
                "type": "set",
                "subtype": "state",
                "target": "heard_bell",
                "value": true
              }
            ]
          }
        }
      }
    },
    "scene_school": {
      "meta": {
        "title": "Trường tiểu học bỏ hoang",
        "desc": "Bài tập trên bảng được viết bằng nét chữ của những đứa trẻ chưa từng tồn tại."
      },
      "set": {
        "activeRouterId": "school_class"
      },
      "routers": {
        "school_class": {
          "meta": {
            "sceneID": "scene_school",
            "desc": "Lớp học số 3"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_check_desk",
            "act_decode_roster"
          ]
        }
      }
    },
    "scene_forest": {
      "meta": {
        "title": "Rừng thông phía Bắc",
        "desc": "Con đường mòn thay đổi mỗi khi người chơi quay lưng."
      },
      "set": {
        "activeRouterId": "forest_path"
      },
      "routers": {
        "forest_path": {
          "meta": {
            "sceneID": "scene_forest",
            "desc": "Lối mòn dưới tán thông"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_follow_marks",
            "act_maze_path"
          ],
          "loop": {
            "enter": [
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              }
            ]
          }
        },
        "forest_clearing": {
          "meta": {
            "sceneID": "scene_forest",
            "desc": "Khoảng đất trống có những cọc gỗ"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_inspect_stakes",
            "act_find_hidden_box"
          ]
        }
      }
    },
    "scene_mill": {
      "meta": {
        "title": "Cối xay nước",
        "desc": "Bánh xe vẫn quay dù dòng suối đã cạn từ lâu."
      },
      "set": {
        "activeRouterId": "mill_floor"
      },
      "routers": {
        "mill_floor": {
          "meta": {
            "sceneID": "scene_mill",
            "desc": "Sàn máy và bảng điều khiển"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_repair_mill",
            "act_set_switches"
          ]
        }
      }
    },
    "scene_tunnel": {
      "meta": {
        "title": "Đường hầm dưới chân đê",
        "desc": "Những bức tường ghi lại tên người dân theo thứ tự ngày họ biến mất."
      },
      "set": {
        "activeRouterId": "tunnel_entry"
      },
      "routers": {
        "tunnel_entry": {
          "meta": {
            "sceneID": "scene_tunnel",
            "desc": "Cửa hầm"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_enter_tunnel",
            "act_open_archive"
          ]
        }
      }
    },
    "scene_station": {
      "meta": {
        "title": "Ga tàu không có trên bản đồ",
        "desc": "Chuyến tàu cuối cùng chỉ dừng lại khi tất cả sự thật được gọi đúng tên."
      },
      "set": {
        "activeRouterId": "station_platform"
      },
      "routers": {
        "station_platform": {
          "meta": {
            "sceneID": "scene_station",
            "desc": "Sân ga lúc 03:17"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0,
            "timer": true,
            "timerSeconds": 180,
            "timerEnd": "still"
          },
          "actions": [
            "act_confront_voice",
            "act_choose_fate"
          ],
          "timer": {
            "end": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "warn",
                "text": "Tiếng còi tàu vang lên. Cánh cửa cuối cùng sẽ khép lại."
              }
            ]
          },
          "loop": {
            "enter": [
              {
                "type": "set",
                "subtype": "state",
                "target": "final_choice",
                "value": "undecided"
              }
            ]
          }
        }
      }
    }
  },
  "actions": {
    "act_read_notice": {
      "meta": {
        "title": "Đọc bảng thông báo",
        "desc": "Danh sách dân làng có một cái tên bị cạo đi."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Danh sách dân làng có một cái tên bị cạo đi."
          }
        ]
      }
    },
    "act_talk_mai": {
      "meta": {
        "title": "Hỏi Mai về đêm mất điện",
        "desc": "Mai chỉ nhớ tiếng chuông và một chiếc ô màu đỏ."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mai chỉ nhớ tiếng chuông và một chiếc ô màu đỏ."
          }
        ]
      }
    },
    "act_inspect_well": {
      "meta": {
        "title": "Quan sát giếng",
        "desc": "Trên thành giếng có bốn vạch khắc mới."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Trên thành giếng có bốn vạch khắc mới."
          }
        ]
      }
    },
    "act_use_lantern": {
      "meta": {
        "title": "Chiếu đèn xuống giếng",
        "desc": "Ánh sáng phản chiếu một ký hiệu: 0417."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Ánh sáng phản chiếu một ký hiệu: 0417."
          }
        ]
      }
    },
    "act_question_hanh": {
      "meta": {
        "title": "Hỏi bà Hạnh",
        "desc": "Bà Hạnh khẳng định nhà trọ chỉ có sáu phòng, dù hành lang có bảy cửa."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bà Hạnh khẳng định nhà trọ chỉ có sáu phòng, dù hành lang có bảy cửa."
          }
        ]
      }
    },
    "act_open_guestbook": {
      "meta": {
        "title": "Mở sổ khách",
        "desc": "Trang cuối ghi tên người chơi với ngày đến là ngày mai."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Trang cuối ghi tên người chơi với ngày đến là ngày mai."
          }
        ],
        "pass": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Đã ghi nhận manh mối: tên người chơi xuất hiện trong sổ."
          }
        ]
      }
    },
    "act_unlock_cellar": {
      "meta": {
        "title": "Mở khóa hầm",
        "desc": "Ổ khóa cần một chuỗi ký tự được ghi trong sổ khách."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "string:pw_guest"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Ổ khóa cần một chuỗi ký tự được ghi trong sổ khách."
          }
        ]
      }
    },
    "act_search_cellar": {
      "meta": {
        "title": "Lục tìm trong hầm",
        "desc": "Một cuộn băng ghi âm được giấu sau thùng rỗng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Một cuộn băng ghi âm được giấu sau thùng rỗng."
          }
        ]
      }
    },
    "act_read_hymn": {
      "meta": {
        "title": "Đọc bản thánh ca",
        "desc": "Các chữ đầu dòng ghép thành từ 'IM LANG'."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Các chữ đầu dòng ghép thành từ 'IM LANG'."
          }
        ]
      }
    },
    "act_talk_keeper": {
      "meta": {
        "title": "Nói chuyện với người giữ nhà nguyện",
        "desc": "Ông ta nói chuông chỉ được rung khi không còn ai nói dối."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Ông ta nói chuông chỉ được rung khi không còn ai nói dối."
          }
        ]
      }
    },
    "act_solve_bell": {
      "meta": {
        "title": "Giải mã mặt đồng hồ",
        "desc": "Bốn con số trên mặt chuông trùng với thời điểm mất tích."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "number:pw_bell"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bốn con số trên mặt chuông trùng với thời điểm mất tích."
          }
        ]
      }
    },
    "act_ring_bell": {
      "meta": {
        "title": "Rung chuông",
        "desc": "Âm thanh làm lớp sương quanh làng tách ra trong vài giây."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Âm thanh làm lớp sương quanh làng tách ra trong vài giây."
          }
        ],
        "pass": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tiếng chuông đánh thức ký ức bị chôn vùi."
          }
        ]
      }
    },
    "act_check_desk": {
      "meta": {
        "title": "Kiểm tra ngăn bàn",
        "desc": "Có danh sách lớp với bốn học sinh bị gạch tên."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Có danh sách lớp với bốn học sinh bị gạch tên."
          }
        ]
      }
    },
    "act_decode_roster": {
      "meta": {
        "title": "Giải mã sơ đồ chỗ ngồi",
        "desc": "Sơ đồ chỉ ra lối đi bí mật dưới bục giảng."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "switch:pw_switch"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Sơ đồ chỉ ra lối đi bí mật dưới bục giảng."
          }
        ]
      }
    },
    "act_follow_marks": {
      "meta": {
        "title": "Lần theo dấu sơn",
        "desc": "Những vệt sơn dẫn tới khoảng đất trống."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những vệt sơn dẫn tới khoảng đất trống."
          }
        ]
      }
    },
    "act_maze_path": {
      "meta": {
        "title": "Tìm đường qua rừng",
        "desc": "Chọn đường đi không bước qua các ô có dấu thập."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "find_way:pw_forest"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chọn đường đi không bước qua các ô có dấu thập."
          }
        ]
      }
    },
    "act_inspect_stakes": {
      "meta": {
        "title": "Đếm cọc gỗ",
        "desc": "Có mười hai cọc, nhưng chỉ mười một cái đổ bóng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Có mười hai cọc, nhưng chỉ mười một cái đổ bóng."
          }
        ]
      }
    },
    "act_find_hidden_box": {
      "meta": {
        "title": "Mở hộp chôn dưới đất",
        "desc": "Bức ảnh gia đình bị xé thành nhiều mảnh."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "puzzle:pw_photo"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bức ảnh gia đình bị xé thành nhiều mảnh."
          }
        ]
      }
    },
    "act_repair_mill": {
      "meta": {
        "title": "Khởi động cối xay",
        "desc": "Bánh xe dừng lại, để lộ một cửa sập dưới sàn."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bánh xe dừng lại, để lộ một cửa sập dưới sàn."
          }
        ]
      }
    },
    "act_set_switches": {
      "meta": {
        "title": "Gạt bảng công tắc",
        "desc": "Đèn báo chuyển từ đỏ sang trắng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Đèn báo chuyển từ đỏ sang trắng."
          }
        ]
      }
    },
    "act_enter_tunnel": {
      "meta": {
        "title": "Đi xuống đường hầm",
        "desc": "Không khí lạnh và có tiếng bước chân đi trước bạn."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Không khí lạnh và có tiếng bước chân đi trước bạn."
          }
        ]
      }
    },
    "act_open_archive": {
      "meta": {
        "title": "Mở kho hồ sơ",
        "desc": "Hồ sơ xác nhận ngôi làng đã bị sơ tán từ mười bảy năm trước."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Hồ sơ xác nhận ngôi làng đã bị sơ tán từ mười bảy năm trước."
          }
        ]
      }
    },
    "act_confront_voice": {
      "meta": {
        "title": "Đối diện giọng nói",
        "desc": "Giọng nói hỏi bạn muốn cứu người sống hay giữ lại ký ức."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Giọng nói hỏi bạn muốn cứu người sống hay giữ lại ký ức."
          }
        ]
      }
    },
    "act_choose_fate": {
      "meta": {
        "title": "Đưa ra lựa chọn cuối cùng",
        "desc": "Bạn không thể mang tất cả mọi người trở về."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn không thể mang tất cả mọi người trở về."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_release"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thu thập đủ ký ức để đưa ra lựa chọn có ý nghĩa."
          }
        ]
      }
    }
  },
  "chat": {
    "chat_mai": {
      "meta": {
        "title": "Mai — Quảng trường",
        "loop": false,
        "sender": "mai",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu nghe loa gọi tên mình, đừng trả lời."
            },
            {
              "char_id": "mai",
              "text": "Đêm đó có mười hai người biến mất. Sáng hôm sau, mọi người chỉ nhớ mười một."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "truth": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi đã nhìn thấy người thứ mười hai đi xuống giếng. Nhưng đó là tôi."
            }
          ],
          "choiced": false
        },
        "silence": {
          "line": [
            {
              "char_id": "mai",
              "text": "Có những chuyện nếu nói ra sẽ khiến làng nhớ lại."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "mai_truth",
            "text": "Hỏi về người thứ mười hai",
            "jump": "truth"
          },
          {
            "id": "mai_silence",
            "text": "Không ép cô ấy",
            "jump": "silence"
          }
        ]
      }
    },
    "chat_hanh": {
      "meta": {
        "title": "Bà Hạnh — Nhà trọ",
        "loop": false,
        "sender": "hanh",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Phòng của cậu đã được chuẩn bị từ trước."
            },
            {
              "char_id": "hanh",
              "text": "Tôi không nhớ ai đã đặt phòng."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "answer": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Sổ khách không ghi người đến. Nó ghi người chưa rời đi."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "ask_book",
            "text": "Hỏi về cuốn sổ",
            "jump": "answer"
          }
        ]
      }
    },
    "chat_keeper": {
      "meta": {
        "title": "Người giữ nhà nguyện",
        "loop": false,
        "sender": "keeper",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Chuông không gọi người chết. Nó gọi những người còn nhớ."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "answer": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Nếu chuông ngân ba hồi, ký ức sẽ trở lại. Nếu ngân bốn hồi, ngôi làng sẽ biến mất."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "keeper_why",
            "text": "Hỏi vì sao ông ở lại",
            "jump": "answer"
          }
        ]
      }
    },
    "chat_voice": {
      "meta": {
        "title": "Tín hiệu ga tàu",
        "loop": false,
        "sender": "voice",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "voice",
              "text": "Cậu đã đến muộn mười bảy năm."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "reveal": {
          "line": [
            {
              "char_id": "voice",
              "text": "Ngôi làng là ký ức tập thể của những người không chấp nhận cuộc sơ tán."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "voice_truth",
            "text": "Hỏi sự thật",
            "jump": "reveal"
          }
        ]
      }
    }
  },
  "characters": {
    "mai": {
      "meta": {
        "name": "Mai",
        "desc": "Người bán hàng trẻ, luôn tránh nhìn về phía giếng."
      },
      "set": {
        "linkEffect": false,
        "alert": "warning",
        "moving": false,
        "move": null
      },
      "stats": {
        "trust": {
          "current": 0,
          "max": 5,
          "label": "Tin tưởng"
        },
        "fear": {
          "current": 2,
          "max": 5,
          "label": "Sợ hãi"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_garden",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_garden",
          "nextStep": 30
        }
      ]
    },
    "hanh": {
      "meta": {
        "name": "Bà Hạnh",
        "desc": "Chủ nhà trọ, nhớ mọi vị khách nhưng phủ nhận từng gặp bạn."
      },
      "set": {
        "linkEffect": false,
        "alert": null,
        "moving": false,
        "move": null
      },
      "stats": {
        "trust": {
          "current": 1,
          "max": 5,
          "label": "Tin tưởng"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_inn",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_inn",
          "nextStep": 45
        }
      ]
    },
    "keeper": {
      "meta": {
        "name": "Người giữ nhà nguyện",
        "desc": "Một người đàn ông không có bóng dưới ánh nến."
      },
      "set": {
        "linkEffect": false,
        "alert": "danger",
        "moving": false,
        "move": null
      },
      "stats": {
        "faith": {
          "current": 3,
          "max": 5,
          "label": "Đức tin"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_chapel",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_chapel",
          "nextStep": 60
        }
      ]
    },
    "linh": {
      "meta": {
        "name": "Linh",
        "desc": "Đứa trẻ trong bức ảnh cũ, xuất hiện ở nơi không có ai."
      },
      "set": {
        "linkEffect": false,
        "alert": "notice",
        "moving": false,
        "move": null
      },
      "stats": {
        "memory": {
          "current": 1,
          "max": 5,
          "label": "Ký ức"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_school",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_school",
          "nextStep": 35
        }
      ]
    },
    "voice": {
      "meta": {
        "name": "Giọng nói dưới ga",
        "desc": "Không rõ là người thân, người lạ hay chính bạn."
      },
      "set": {
        "linkEffect": false,
        "alert": "danger",
        "moving": false,
        "move": null
      },
      "stats": {
        "echo": {
          "current": 4,
          "max": 5,
          "label": "Dư âm"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_station",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_station",
          "nextStep": 50
        }
      ]
    }
  },
  "endings": {
    "ending_release": {
      "title": "Hồi Chuông Cuối Cùng",
      "desc": "Bạn gọi đúng tên mười hai người và rung chuông ba hồi. Ký ức được trả về cho những người còn sống; ngôi làng tan vào sương, nhưng lần đầu tiên không ai bị lãng quên."
    },
    "ending_bury": {
      "title": "Ngôi Làng Ngủ Yên",
      "desc": "Bạn phá hủy hồ sơ và rời đi. Ngôi làng tiếp tục tồn tại trong im lặng, còn sự thật bị chôn thêm một thế hệ."
    },
    "ending_echo": {
      "title": "Tiếng Vọng Thứ Mười Hai",
      "desc": "Bạn trả lời tiếng loa. Ngôi làng nhận ra bạn là mảnh ký ức bị thiếu và giữ bạn lại để lấp đầy chỗ trống."
    },
    "ending_depart": {
      "title": "Chuyến Tàu Lúc 03:17",
      "desc": "Bạn lên tàu mà không chọn phe. Tàu rời ga, nhưng trong cửa kính phản chiếu vẫn có một người đứng sau lưng bạn."
    }
  },
  "config": {
    "fakerMode": "soul",
    "minTransition": 1,
    "minAutomationNextStep": 2,
    "maxCharacterMoving": 5,
    "maxInventory": [
      [
        8,
        "player"
      ]
    ],
    "maxHandOn": 2,
    "brokenDisable": false,
    "minCharacterMoving": 30,
    "stopEffectWhenChat": false,
    "navContact": true,
    "navInventory": true,
    "defaultNotice": true,
    "allDescRead": false,
    "clickHintDesc": 2
  }
};
