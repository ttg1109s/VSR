// demo_script.js
// THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động
// Scenario format v1; Scene = physical space, Router = spatial state, Action = interaction/change.
export const DEMO_SCRIPT = {
  "formatVersion": 1,
  "meta": {
    "title": "THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động",
    "subtitle": "Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại",
    "desc": "Bạn tỉnh dậy ở quảng trường của một ngôi làng bị mắc kẹt trong ký ức. Lần theo dấu vết qua giếng đá, nhà trọ, nhà nguyện, trường học, khu rừng, cối xay và đường hầm để tìm sân ga xuất hiện lúc 03:17; sự thật được ghép lại sẽ quyết định ai được giải thoát.",
    "writer": "VSR Demo Team",
    "studio": "VSR",
    "version": "2.0.0",
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
    "entryScene": "scene_village_square",
    "entryCharacter": "player",
    "createdAt": "2026-11-15T00:00:00.000Z",
    "updatedAt": "2026-11-16T00:00:00.000Z",
    "copyright": "Original demo scenario for VSR Engine",
    "license": "UNLICENSED",
    "notes": "Structural rewrite: every distinct physical location is a Scene; each Router represents a state/presentation of that space; Actions encode interaction, state changes and navigation."
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
    "final_choice": {
      "type": "string",
      "value": "undecided"
    },
    "clue_notice": {
      "type": "boolean",
      "value": false
    },
    "clue_tape": {
      "type": "boolean",
      "value": false
    },
    "clue_photo": {
      "type": "boolean",
      "value": false
    },
    "clue_roster": {
      "type": "boolean",
      "value": false
    },
    "cellar_open": {
      "type": "boolean",
      "value": false
    },
    "mill_powered": {
      "type": "boolean",
      "value": false
    },
    "archive_open": {
      "type": "boolean",
      "value": false
    },
    "voice_revealed": {
      "type": "boolean",
      "value": false
    },
    "clue_tunnel": {
      "type": "boolean",
      "value": false
    },
    "clue_well": {
      "type": "boolean",
      "value": false
    },
    "bell_rung": {
      "type": "boolean",
      "value": false
    },
    "clue_hymn": {
      "type": "boolean",
      "value": false
    },
    "clue_stakes": {
      "type": "boolean",
      "value": false
    },
    "evidence_broadcast": {
      "type": "boolean",
      "value": false
    },
    "evidence_well_badge": {
      "type": "boolean",
      "value": false
    },
    "evidence_hidden_room": {
      "type": "boolean",
      "value": false
    },
    "evidence_evacuation_film": {
      "type": "boolean",
      "value": false
    },
    "evidence_hymn_note": {
      "type": "boolean",
      "value": false
    },
    "evidence_bell_wire": {
      "type": "boolean",
      "value": false
    },
    "evidence_class_register": {
      "type": "boolean",
      "value": false
    },
    "evidence_forest_route": {
      "type": "boolean",
      "value": false
    },
    "evidence_evacuation_seal": {
      "type": "boolean",
      "value": false
    },
    "evidence_gear_pin": {
      "type": "boolean",
      "value": false
    },
    "evidence_tunnel_manifest": {
      "type": "boolean",
      "value": false
    },
    "evidence_station_ticket": {
      "type": "boolean",
      "value": false
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
      },
      "has_lantern_clue": {
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
      "has_guestbook": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "found_guestbook",
            "op": "==",
            "value": true
          }
        ]
      },
      "has_archive_key": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "archive_key"
          }
        ]
      },
      "station_ready": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          }
        ]
      },
      "release_ready": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          },
          {
            "type": "state",
            "property": "bell_rung",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "evacuation_seal"
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
          "level": "warning",
          "text": "Sương đang dày lên. Thời gian ở lại không còn nhiều."
        }
      ]
    },
    "automation": {}
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "found_guestbook",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những cái tên trong sổ không phải khách trọ. Đó là người chưa thể rời làng."
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tape",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Giọng nói trong băng nhắc đến hồi chuông lúc 03:17."
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mặt trong cán ô có khắc tên người thứ mười hai."
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "heard_bell",
            "value": true
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          }
        ]
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
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          }
        ]
      }
    },
    "radio_crystal": {
      "name": "Cuộn tinh thể thu sóng",
      "icon": "radio",
      "desc": "Linh kiện lấy từ hộp loa, có thể dò lại tần số phát thanh.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_broadcast",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu cuộn tinh thể thu sóng với các manh mối đã thu thập."
          }
        ]
      }
    },
    "well_badge": {
      "name": "Phù hiệu đội sơ tán",
      "icon": "badge",
      "desc": "Phù hiệu kim loại có khắc ký hiệu của đội sơ tán năm ấy.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_well_badge",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu phù hiệu đội sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "spare_room_key": {
      "name": "Chìa khóa phòng thứ bảy",
      "icon": "key",
      "desc": "Chìa khóa đồng mở căn phòng bị xóa khỏi sơ đồ nhà trọ.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hidden_room",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu chìa khóa phòng thứ bảy với các manh mối đã thu thập."
          }
        ]
      }
    },
    "evacuation_film": {
      "name": "Cuộn phim sơ tán",
      "icon": "film",
      "desc": "Cuộn phim ghi lại đám đông ở bờ đê trong đêm mất tích.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_film",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu cuộn phim sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "hymn_note": {
      "name": "Trang ghi chú trong thánh ca",
      "icon": "scroll",
      "desc": "Mảnh giấy giải thích ý nghĩa của ba hồi chuông trong đêm sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hymn_note",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu trang ghi chú trong thánh ca với các manh mối đã thu thập."
          }
        ]
      }
    },
    "bell_copper_wire": {
      "name": "Dây đồng chuông",
      "icon": "cable",
      "desc": "Đoạn dây đồng dùng để nối lại cơ cấu truyền lực của chuông.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_bell_wire",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu dây đồng chuông với các manh mối đã thu thập."
          }
        ]
      }
    },
    "class_register_copy": {
      "name": "Bản sao sổ điểm danh",
      "icon": "book-open",
      "desc": "Bản ghi xác nhận có mười hai học sinh trong lớp vào ngày sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_class_register",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu bản sao sổ điểm danh với các manh mối đã thu thập."
          }
        ]
      }
    },
    "guide_compass": {
      "name": "La bàn người dẫn đường",
      "icon": "compass",
      "desc": "La bàn cũ có khắc tuyến đường từ rừng xuống chân đê.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_forest_route",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu la bàn người dẫn đường với các manh mối đã thu thập."
          }
        ]
      }
    },
    "evacuation_seal": {
      "name": "Con dấu đội sơ tán",
      "icon": "stamp",
      "desc": "Con dấu gỗ dùng để xác nhận danh sách sơ tán chính thức.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu con dấu đội sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "mill_gear_pin": {
      "name": "Chốt truyền động",
      "icon": "settings",
      "desc": "Chốt kim loại thay thế cho bộ truyền động của cối xay nước.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_gear_pin",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu chốt truyền động với các manh mối đã thu thập."
          }
        ]
      }
    },
    "tunnel_manifest": {
      "name": "Danh sách vận chuyển",
      "icon": "file-text",
      "desc": "Danh sách ghi tên những người được đưa qua đường hầm trong đêm sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_tunnel_manifest",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu danh sách vận chuyển với các manh mối đã thu thập."
          }
        ]
      }
    },
    "unpunched_ticket": {
      "name": "Vé tàu chưa xé",
      "icon": "ticket",
      "desc": "Vé của chuyến 03:17, còn nguyên phần kiểm soát.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_station_ticket",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu vé tàu chưa xé với các manh mối đã thu thập."
          }
        ]
      }
    }
  },
  "passwords": {
    "number": {
      "pw_bell": {
        "desc": "Nhập thời điểm khắc trên mặt đồng hồ của tháp chuông.",
        "display": "keyboard",
        "value": "0417",
        "retryMax": 5
      }
    },
    "string": {
      "pw_guest": {
        "desc": "Mật từ ghép từ chữ cái đầu của bốn dòng trong bản thánh ca.",
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
        "desc": "Lần theo dãy ô liền kề được đánh dấu từ cổng rừng đến khoảng đất nghi lễ.",
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
    }
  },
  "scenes": {
    "scene_village_square": {
      "meta": {
        "title": "Quảng trường làng",
        "desc": "Không gian công cộng ở trung tâm làng; bảng thông báo và loa phát thanh là hai nguồn manh mối đầu tiên."
      },
      "set": {
        "activeRouterId": "router_square_fogbound"
      },
      "routers": {
        "router_square_fogbound": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Mù sương",
            "desc": "Sương phủ kín quảng trường, làm nhòe những dãy nhà quanh cổng làng. Chiếc loa phát thanh vẫn đều đặn gọi tên những người đã mất tích; bảng thông báo bên đường lưu lại danh sách dân làng với một cái tên bị cạo đi."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_notice",
            "action_talk_mai",
            "action_enter_well",
            "action_travel_inn",
            "action_travel_chapel",
            "action_travel_school",
            "action_travel_forest",
            "action_decode_broadcast"
          ]
        },
        "router_square_broadcast_decoded": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Đã giải mã",
            "desc": "Sau khi tháo nắp hộp loa, bạn tìm thấy cuộn dây đồng và sơ đồ tần số. Tiếng gọi tên dân làng không phải phát thanh trực tiếp mà là bản ghi được phát lặp theo chu kỳ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_notice",
            "action_talk_mai",
            "action_enter_well",
            "action_travel_inn",
            "action_travel_chapel",
            "action_travel_school",
            "action_travel_forest",
            "action_return_view_village_square"
          ]
        }
      }
    },
    "scene_village_well": {
      "meta": {
        "title": "Giếng đá",
        "desc": "Giếng nằm ngay rìa quảng trường, nơi dấu vết của người thứ mười hai bị che giấu.",
        "parentScene": "scene_village_square"
      },
      "set": {
        "activeRouterId": "router_well_echoes"
      },
      "routers": {
        "router_well_echoes": {
          "meta": {
            "sceneID": "scene_village_well",
            "subTitleStatus": "Có tiếng vọng",
            "desc": "Trong màn sương của quảng trường, tiếng gõ đều đặn vọng lên từ chiếc giếng đá phủ rêu. Trên thành giếng có bốn vạch khắc mới và một vết kim loại bị cào xước."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern",
            "action_return_square",
            "action_retrieve_well_badge"
          ]
        },
        "router_well_bottom_revealed": {
          "meta": {
            "sceneID": "scene_village_well",
            "subTitleStatus": "Dấu tích sơ tán",
            "desc": "Ánh đèn soi rõ một hốc nhỏ dưới mực nước cũ. Bên trong là phù hiệu kim loại của đội sơ tán, khớp với ký hiệu trên bản đồ làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern",
            "action_return_square",
            "action_return_view_village_well"
          ]
        }
      }
    },
    "scene_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "desc": "Nhà trọ là nơi lưu giữ sổ khách và lời khai về những người chưa thể rời làng."
      },
      "set": {
        "activeRouterId": "router_inn_unsettled"
      },
      "routers": {
        "router_inn_unsettled": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Bất an",
            "desc": "Mùi trà nguội quẩn quanh quầy lễ tân. Cuốn sổ khách ghi tên những người được cho là đã rời làng, nhưng trang cuối lại mang tên bạn với ngày đến là ngày mai."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_question_hanh",
            "action_open_guestbook",
            "action_return_square",
            "action_travel_chapel",
            "action_unlock_cellar",
            "action_find_spare_key"
          ]
        },
        "router_inn_hidden_room": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Phòng thứ bảy",
            "desc": "Sau quầy lễ tân có một ổ khóa nhỏ nối với hành lang. Chìa khóa dự phòng mở căn phòng không xuất hiện trong sơ đồ nhà trọ; bên trong chỉ còn một thẻ gửi đồ cũ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_question_hanh",
            "action_open_guestbook",
            "action_return_square",
            "action_travel_chapel",
            "action_unlock_cellar",
            "action_return_view_inn"
          ]
        }
      }
    },
    "scene_inn_cellar": {
      "meta": {
        "title": "Hầm rượu nhà trọ",
        "desc": "Căn hầm nằm dưới nhà trọ; cửa chỉ mở khi tìm được sổ khách và giải đúng mật từ trong thánh ca.",
        "parentScene": "scene_inn"
      },
      "set": {
        "activeRouterId": "router_cellar_open"
      },
      "routers": {
        "router_cellar_open": {
          "meta": {
            "sceneID": "scene_inn_cellar",
            "subTitleStatus": "Đã mở khóa",
            "desc": "Ổ khóa đã bật mở, để lộ cầu thang dẫn xuống căn hầm rượu tối và lạnh. Một cuộn băng ghi âm đêm mất điện được giấu sau chiếc thùng rỗng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar",
            "action_return_inn",
            "action_find_evacuation_film"
          ]
        },
        "router_cellar_recording_found": {
          "meta": {
            "sceneID": "scene_inn_cellar",
            "subTitleStatus": "Tìm thấy cuộn phim",
            "desc": "Phía sau kệ rượu có một máy chiếu cũ và cuộn phim chưa tráng. Những khung hình cho thấy người dân tập trung ở bờ đê trước thời điểm mất điện."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar",
            "action_return_inn",
            "action_return_view_inn_cellar"
          ]
        }
      }
    },
    "scene_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "desc": "Gian cầu nguyện lưu bản thánh ca chứa mật từ và lời giải về hồi chuông cuối."
      },
      "set": {
        "activeRouterId": "router_chapel_silent"
      },
      "routers": {
        "router_chapel_silent": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Im lặng",
            "desc": "Gian cầu nguyện chìm trong tĩnh lặng. Chuông đã ngừng ngân từ mười bảy năm trước, nhưng bản thánh ca còn lưu lại mật từ và chỉ dẫn về ba hồi chuông."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_hymn",
            "action_talk_keeper",
            "action_enter_tower",
            "action_return_square",
            "action_travel_school",
            "action_find_hymn_note"
          ]
        },
        "router_chapel_cryptic_note": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Lời nhắn bí mật",
            "desc": "Một trang giấy mỏng được khâu vào gáy sách. Nội dung xác nhận ba hồi chuông là tín hiệu kết thúc sơ tán, còn hồi thứ tư là lệnh ở lại."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_hymn",
            "action_talk_keeper",
            "action_enter_tower",
            "action_return_square",
            "action_travel_school",
            "action_return_view_chapel"
          ]
        }
      }
    },
    "scene_chapel_tower": {
      "meta": {
        "title": "Tháp chuông",
        "desc": "Tháp nằm phía trên nhà nguyện; mặt đồng hồ ghi thời điểm sự kiện và cơ cấu chuông bị tháo rời.",
        "parentScene": "scene_chapel"
      },
      "set": {
        "activeRouterId": "router_bell_chamber"
      },
      "routers": {
        "router_bell_chamber": {
          "meta": {
            "sceneID": "scene_chapel_tower",
            "subTitleStatus": "Chuông im lìm",
            "desc": "Trên tháp, quả chuông câm lặng treo phía trên mặt đồng hồ. Quả lắc đã bị tháo rời; mã khắc dưới mặt đồng hồ liên quan đến thời điểm những người dân biến mất."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_return_chapel",
            "action_recover_bell_wire"
          ]
        },
        "router_bell_mechanism_repaired": {
          "meta": {
            "sceneID": "scene_chapel_tower",
            "subTitleStatus": "Đã nối cơ cấu",
            "desc": "Một đoạn dây đồng còn cuộn quanh trục bánh răng. Sau khi lắp lại, cơ cấu truyền lực hoạt động nhưng chuông vẫn chỉ được rung khi quả lắc được tìm thấy."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_return_chapel",
            "action_return_view_chapel_tower"
          ]
        }
      }
    },
    "scene_abandoned_school": {
      "meta": {
        "title": "Trường tiểu học bỏ hoang",
        "desc": "Trường học lưu sơ đồ lớp và dấu vết về học sinh thứ mười hai bị xóa khỏi hồ sơ."
      },
      "set": {
        "activeRouterId": "router_classroom_erased"
      },
      "routers": {
        "router_classroom_erased": {
          "meta": {
            "sceneID": "scene_abandoned_school",
            "subTitleStatus": "Bị xóa tên",
            "desc": "Trong lớp học số 3, danh sách chỉ còn những cái tên bị gạch bỏ và bức ảnh tập thể bị xé. Sơ đồ chỗ ngồi có dấu vết của vị trí thứ mười hai, nhưng vị trí ấy đã bị xóa khỏi mọi bản sao."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_check_desk",
            "action_decode_roster",
            "action_return_square",
            "action_travel_forest",
            "action_recover_class_register"
          ]
        },
        "router_classroom_archive_open": {
          "meta": {
            "sceneID": "scene_abandoned_school",
            "subTitleStatus": "Đã khôi phục hồ sơ",
            "desc": "Một ngăn bàn bị đóng đinh chứa bản sao sổ điểm danh. Tên học sinh thứ mười hai vẫn bị bôi đen, nhưng số thứ tự và ngày nghỉ học trùng với hồ sơ sơ tán."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_check_desk",
            "action_decode_roster",
            "action_return_square",
            "action_travel_forest",
            "action_return_view_abandoned_school"
          ]
        }
      }
    },
    "scene_north_forest": {
      "meta": {
        "title": "Lối rừng phía Bắc",
        "desc": "Con đường xuyên rừng biến đổi, nhưng các dấu sơn giúp lần tới khu đất nghi lễ."
      },
      "set": {
        "activeRouterId": "router_forest_path_shifting"
      },
      "routers": {
        "router_forest_path_shifting": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Đường đi biến đổi",
            "desc": "Con đường mòn dưới tán thông không giữ nguyên hình dạng khi bạn quay lưng. Những vệt sơn trên thân cây là dấu hiệu hiếm hoi giúp xác định hướng đi tới khoảng đất trống."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_follow_marks",
            "action_maze_path",
            "action_enter_clearing",
            "action_return_square",
            "action_collect_forest_compass"
          ]
        },
        "router_forest_markers_aligned": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Dấu mốc đã khớp",
            "desc": "Khi đối chiếu vết sơn với hướng la bàn, bạn nhận ra các dấu mốc không chỉ dẫn đường trong rừng mà còn đánh dấu tuyến vận chuyển người xuống bờ đê."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_follow_marks",
            "action_maze_path",
            "action_enter_clearing",
            "action_return_square",
            "action_return_view_north_forest"
          ]
        }
      }
    },
    "scene_forest_clearing": {
      "meta": {
        "title": "Khoảng đất nghi lễ",
        "desc": "Khoảng đất trống giữa rừng có vòng cọc và chiếc hộp chôn chứa vật chứng.",
        "parentScene": "scene_north_forest"
      },
      "set": {
        "activeRouterId": "router_forest_clearing"
      },
      "routers": {
        "router_forest_clearing": {
          "meta": {
            "sceneID": "scene_forest_clearing",
            "subTitleStatus": "Bóng bị khuyết",
            "desc": "Mười hai cọc gỗ tạo thành một vòng cung giữa khoảng đất trống, nhưng chỉ có mười một chiếc bóng. Một chiếc hộp được chôn gần vòng cọc chứa những mảnh ảnh gia đình."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_return_forest",
            "action_travel_mill",
            "action_find_wooden_seal"
          ]
        },
        "router_clearing_ritual_trace": {
          "meta": {
            "sceneID": "scene_forest_clearing",
            "subTitleStatus": "Đã giải nghĩa",
            "desc": "Dưới phiến đá giữa vòng cọc là một con dấu gỗ. Nó không phải vật tế lễ mà là dấu xác nhận của đội sơ tán, được dùng để niêm phong danh sách người đã rời làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_return_forest",
            "action_travel_mill",
            "action_return_view_forest_clearing"
          ]
        }
      }
    },
    "scene_watermill": {
      "meta": {
        "title": "Cối xay nước",
        "desc": "Cối xay cũ là nút cơ giới dẫn xuống đường hầm dưới chân đê."
      },
      "set": {
        "activeRouterId": "router_watermill_stalled"
      },
      "routers": {
        "router_watermill_stalled": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Ngừng hoạt động",
            "desc": "Dòng suối đã cạn, bánh xe mục kẹt cứng trên trục. Bảng điều khiển còn nguyên; cần mảnh sơ đồ lấy từ trường học để xác định cách lắp lại cơ cấu truyền động."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_return_forest",
            "action_find_gear_pin"
          ]
        },
        "router_watermill_running": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Đang vận hành",
            "desc": "Bánh xe đã ăn khớp với trục truyền động. Dưới sàn, cửa sập rung lên theo nhịp máy và để lộ lối xuống đường hầm dưới chân đê."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_descend_tunnel",
            "action_return_forest"
          ]
        },
        "router_watermill_gear_inspected": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Lộ lỗi truyền động",
            "desc": "Khi tháo tấm che bánh răng, bạn tìm thấy chốt truyền động bị cong. Nó giải thích vì sao cối xay dừng lại; chốt phải được lắp đúng trước khi khởi động máy."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_return_forest",
            "action_return_view_watermill"
          ]
        }
      }
    },
    "scene_levee_tunnel": {
      "meta": {
        "title": "Đường hầm dưới chân đê",
        "desc": "Đường hầm ghi tên người mất tích và dẫn tới kho hồ sơ cùng sân ga bí mật.",
        "parentScene": "scene_watermill"
      },
      "set": {
        "activeRouterId": "router_tunnel_names"
      },
      "routers": {
        "router_tunnel_names": {
          "meta": {
            "sceneID": "scene_levee_tunnel",
            "subTitleStatus": "Tên bị khắc",
            "desc": "Những bức tường đường hầm ghi tên dân làng theo đúng thứ tự ngày họ biến mất. Danh sách có dấu hiệu bị sửa: số tên thực tế nhiều hơn những gì hồ sơ chính thức ghi nhận."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_enter_tunnel",
            "action_open_archive",
            "action_return_mill",
            "action_reach_station",
            "action_recover_tunnel_manifest"
          ]
        },
        "router_tunnel_manifest_found": {
          "meta": {
            "sceneID": "scene_levee_tunnel",
            "subTitleStatus": "Đã tìm danh sách",
            "desc": "Sau lớp gạch rỗng là một ống đựng tài liệu chống ẩm. Danh sách ghi rõ những người được đưa qua đường hầm và xác nhận ga tàu là điểm tập kết cuối cùng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_enter_tunnel",
            "action_open_archive",
            "action_return_mill",
            "action_reach_station",
            "action_return_view_levee_tunnel"
          ]
        }
      }
    },
    "scene_ghost_station": {
      "meta": {
        "title": "Ga tàu không có trên bản đồ",
        "desc": "Sân ga xuất hiện lúc 03:17; tại đây người chơi đối diện giọng nói và quyết định kết cục.",
        "parentScene": "scene_levee_tunnel"
      },
      "set": {
        "activeRouterId": "router_station_0317"
      },
      "routers": {
        "router_station_0317": {
          "meta": {
            "sceneID": "scene_ghost_station",
            "subTitleStatus": "Chuyến 03:17",
            "desc": "Sân ga không xuất hiện trên bất kỳ tấm bản đồ nào. Một chuyến tàu dừng lại lúc 03:17; giọng nói vang lên từ đường ray buộc bạn phải lựa chọn điều gì sẽ được giữ lại và điều gì phải chấm dứt."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0,
            "timer": true,
            "timerSeconds": 240,
            "timerEnd": "still"
          },
          "actions": [
            "action_confront_voice",
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_find_station_ticket"
          ]
        },
        "router_station_departure_records": {
          "meta": {
            "sceneID": "scene_ghost_station",
            "subTitleStatus": "Hồ sơ chuyến tàu",
            "desc": "Dưới ghế chờ là một vé tàu chưa xé và bản kê hành khách. Tấm vé xác nhận chuyến 03:17 từng tồn tại, nhưng không chứng minh rằng mọi người trên danh sách đã lên tàu."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_confront_voice",
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_return_view_ghost_station"
          ]
        }
      }
    }
  },
  "actions":   {
    "action_read_notice": {
      "meta": {
        "title": "Bảng thông báo",
        "buttonLabel": "Đọc",
        "desc": "Bảng thông báo dựng cạnh lối vào quảng trường, nơi dân làng từng xem tin và lịch sơ tán. Danh sách vẫn còn nguyên các dòng chữ, chỉ riêng một cái tên bị cạo sâu đến rách mặt giấy. Dưới chân bảng là chiếc đèn bão phủ bụi, như thể người cuối cùng đọc thông báo đã vội bỏ nó lại giữa chừng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_notice",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "lantern"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn nhặt được đèn bão. Ánh sáng của nó có thể làm lộ dấu vết trong sương."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_read_notice",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_talk_mai": {
      "meta": {
        "title": "Mai",
        "buttonLabel": "Hỏi chuyện",
        "desc": "Mai đứng gần quảng trường nhưng luôn giữ khoảng cách với giếng đá. Mỗi lần loa phát thanh gọi tên một người mất tích, cô lại ngừng nói và nhìn về phía mặt nước. Cô dường như biết nhiều hơn những gì đang kể, nhưng cần được hỏi đúng cách để chịu nhắc lại đêm hôm ấy."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai"
          }
        ]
      }
    },
    "action_inspect_well": {
      "meta": {
        "title": "Giếng đá",
        "buttonLabel": "Quan sát",
        "desc": "Giếng đá nằm ở rìa quảng trường, phủ rêu nhưng phần thành phía đông có dấu mới bị cạo sạch. Bốn vạch khắc thẳng hàng giống ký hiệu đo đạc hơn là vết xước ngẫu nhiên; bên cạnh là một rãnh kim loại mảnh, như thể có vật gì từng được móc khỏi hốc đá."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_well",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bốn vạch khắc là tọa độ của giếng trong bản đồ sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_well",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_use_lantern": {
      "meta": {
        "title": "Đáy giếng",
        "buttonLabel": "Soi đèn",
        "desc": "Đáy giếng chìm trong lớp nước cũ và bóng tối, nơi mắt thường không thể phân biệt ký hiệu trên thành đá. Những dấu khắc chỉ hiện rõ khi ánh sáng được chiếu đúng góc; chiếc đèn bão nhặt ở quảng trường có thể giúp soi ra phần chữ bị che khuất."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ánh sáng phản chiếu mã 0417 và một dòng chữ: 'đừng rung hồi thứ tư'."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_use_lantern",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Ánh sáng chưa được kích hoạt; hãy tìm và khôi phục manh mối liên quan đến chiếc đèn trước khi soi đáy giếng."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_question_hanh": {
      "meta": {
        "title": "Bà Hạnh",
        "buttonLabel": "Chất vấn",
        "desc": "Bà Hạnh quản lý nhà trọ và nắm giữ cuốn sổ ghi khách đến, khách đi. Bà khẳng định nơi này chỉ có sáu phòng, nhưng hành lang phía sau quầy lại có bảy cánh cửa. Sự chênh lệch ấy không giống một nhầm lẫn trong cách đếm; nó giống một căn phòng đã bị cố tình xóa khỏi lời kể."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh"
          }
        ]
      }
    },
    "action_open_guestbook": {
      "meta": {
        "title": "Sổ khách",
        "buttonLabel": "Mở sổ",
        "desc": "Cuốn sổ khách nằm sau quầy lễ tân, giấy đã ngả vàng và nhiều trang bị nhòe bởi hơi ẩm. Những dòng ghi chép cũ cho thấy khách thường rời đi ngay sau đêm mất điện. Ở trang cuối, tên bạn xuất hiện cạnh ngày đến là ngày mai, nét mực vẫn còn mới dù cuốn sổ đã bị bỏ quên."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "found_guestbook",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "guestbook"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn nhận được sổ khách. Trang cuối có dấu mực còn ướt."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_guestbook",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_unlock_cellar": {
      "meta": {
        "title": "Cửa hầm rượu",
        "buttonLabel": "Mở khóa",
        "desc": "Ổ khóa phụ dưới quầy không dẫn ra cửa chính mà mở lối xuống hầm rượu, nơi nhà trọ cất những thứ không muốn khách nhìn thấy. Trên thân khóa có vết khắc của căn phòng thứ bảy; cơ cấu chỉ nhận đúng mật từ trong thánh ca và cần đối chiếu với sổ khách cùng chìa khóa dự phòng."
      },
      "set": {
        "display": "show",
        "password": "string:pw_guest",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "cellar_open",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ổ khóa bật mở. Cầu thang dẫn xuống hầm rượu."
          },
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_inn_cellar"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Chưa đủ căn cứ mở ổ khóa: cần sổ khách cùng chìa khóa phòng thứ bảy. Mật từ thánh ca sẽ được kiểm tra riêng sau khi các vật chứng này có mặt."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "found_guestbook",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guestbook"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_room_key"
          }
        ]
      }
    },
    "action_search_cellar": {
      "meta": {
        "title": "Hầm rượu",
        "buttonLabel": "Tìm kiếm",
        "desc": "Hầm rượu lạnh và gần như trống rỗng, ngoại trừ những thùng gỗ xếp sát tường. Một thùng rỗng có vết kéo lê mới trên nền bụi, phía sau nó là cuộn băng được bọc trong giấy dầu. Ngày ghi trên nhãn trùng với đêm mất điện mà các nhân chứng đều né tránh nhắc đến."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tape",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "tape"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy cuộn băng ghi âm đêm mất điện."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_search_cellar",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_read_hymn": {
      "meta": {
        "title": "Bản thánh ca",
        "buttonLabel": "Giải mã",
        "desc": "Bản thánh ca nằm trên giá gỗ trong gian cầu nguyện. Mực ở vài dòng đã nhạt, nhưng chữ cái đầu mỗi dòng vẫn được viết đậm bất thường; ghép chúng lại thành cụm “IM LANG”. Một dòng khác bị gạch dưới nhiều lần, nhắc đến ba hồi chuông và sự im lặng sau đó."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_hymn",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn ghi nhớ mật từ IM LANG và quy tắc ba hồi chuông."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_read_hymn",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_talk_keeper": {
      "meta": {
        "title": "Người giữ nhà nguyện",
        "buttonLabel": "Trò chuyện",
        "desc": "Người giữ nhà nguyện đã ở đây từ trước khi chuông ngừng ngân. Ông không phủ nhận việc cơ cấu chuông bị tháo rời, nhưng luôn nói rằng tiếng chuông không chỉ để báo giờ. Theo ông, người giữ chuông phải chấp nhận điều đã xảy ra trước khi có thể đánh thức những ký ức bị chôn vùi."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_keeper"
          }
        ]
      }
    },
    "action_solve_bell": {
      "meta": {
        "title": "Mặt đồng hồ",
        "buttonLabel": "Giải mã",
        "desc": "Mặt đồng hồ trên tháp đã dừng ở một thời điểm không khớp với bất kỳ chiếc đồng hồ nào trong làng. Dưới lớp bụi có mã bốn chữ số được khắc sâu, ngay cạnh dấu vít cho thấy quả lắc từng bị tháo khỏi cơ cấu. Con số này liên hệ trực tiếp đến thời khắc dân làng biến mất."
      },
      "set": {
        "display": "show",
        "password": "number:pw_bell"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "heard_bell",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "bell_clapper"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy quả lắc chuông bị tháo rời. Mã 0417 đã được xác nhận."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_solve_bell",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_ring_bell": {
      "meta": {
        "title": "Chuông nhà nguyện",
        "buttonLabel": "Rung ba hồi",
        "desc": "Quả chuông lớn vẫn treo trên tháp, nhưng cơ cấu truyền lực đã bị tháo rời và để lại những đầu dây đồng trơ ra. Quả lắc được cất riêng, còn trang ghi chú trong thánh ca mô tả thứ tự tín hiệu: ba hồi để báo kết thúc sơ tán, tuyệt đối không có hồi thứ tư. Chỉ khi các bộ phận được lắp đúng, chuông mới có thể vang trở lại."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "remove",
            "target": "bell_clapper"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "bell_rung",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ba hồi chuông xé màn sương. Những ký ức bị chôn vùi bắt đầu trở lại."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_ring_bell",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Cơ cấu chuông chưa đủ bộ phận. Cần quả lắc, dây đồng, trang ghi chú trong thánh ca và xác nhận mã thời điểm trước khi rung."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_clapper"
          },
          {
            "type": "state",
            "property": "heard_bell",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "hymn_note"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_copper_wire"
          }
        ]
      }
    },
    "action_check_desk": {
      "meta": {
        "title": "Ngăn bàn giáo viên",
        "buttonLabel": "Kiểm tra",
        "desc": "Ngăn bàn giáo viên chứa một danh sách lớp đã bị sửa bằng mực đen. Bốn cái tên bị gạch bỏ, còn bức ảnh tập thể bên cạnh bị xé khỏi phần giữa. Những dấu ghim và mép giấy cho thấy ảnh từng được giữ cùng một ghi chú về học sinh thứ mười hai."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "class_photo"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy ảnh lớp bị xé và ghi chú về học sinh thứ mười hai."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_check_desk",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_decode_roster": {
      "meta": {
        "title": "Sơ đồ chỗ ngồi",
        "buttonLabel": "Đối chiếu",
        "desc": "Sơ đồ chỗ ngồi của lớp số 3 có một khoảng trống bất thường giữa các dãy bàn. Bản gốc và những bản sao còn lại đều xóa cùng một vị trí, như thể mọi hồ sơ đã được sửa theo một chỉ thị thống nhất. Bản sao sổ điểm danh là đối chứng duy nhất còn ghi đủ sĩ số của ngày sơ tán."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "map_fragment"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mảnh bản đồ chỉ tới cối xay nước phía Bắc."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_decode_roster",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn chưa có bản sao sổ điểm danh để đối chiếu với sơ đồ chỗ ngồi đã bị sửa."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "class_register_copy"
          }
        ]
      }
    },
    "action_follow_marks": {
      "meta": {
        "title": "Dấu sơn trong rừng",
        "buttonLabel": "Lần theo",
        "desc": "Các vệt sơn trên thân thông xuất hiện theo cặp, có chỗ bị rêu che gần hết. Chúng không phải dấu đánh dấu đường đi thông thường: khoảng cách giữa các vệt thay đổi theo hướng rẽ và dẫn đến một khoảng đất trống khuất sau sườn dốc. Từ đó có thể nhìn thấy vòng cọc gỗ giữa rừng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_stakes",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn xác định được hướng đi an toàn qua rừng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_follow_marks",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_maze_path": {
      "meta": {
        "title": "Mê cung trong rừng",
        "buttonLabel": "Tìm đường",
        "desc": "Lối mòn trong rừng thay đổi vị trí mỗi khi bạn quay đi, khiến các dấu cây quen thuộc không còn đáng tin. La bàn của người dẫn đường có khắc một tuyến ô vuông cố định; đường đúng phải nối các ô liền kề từ cổng rừng đến khoảng đất trống, không được tự ý cắt qua những ô không có dấu."
      },
      "set": {
        "display": "show",
        "password": "find_way:pw_forest",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "archive_key"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn vượt qua mê cung và nhặt được chìa khóa kho hồ sơ."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_maze_path",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn chưa có la bàn của người dẫn đường; các lối mòn thay đổi khiến việc lần đường bằng dấu sơn đơn thuần không đáng tin."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guide_compass"
          }
        ]
      }
    },
    "action_inspect_stakes": {
      "meta": {
        "title": "Vòng cọc gỗ",
        "buttonLabel": "Đếm cọc",
        "desc": "Mười hai cọc gỗ cắm thành một vòng cung trên nền đất cứng. Ánh sáng chỉ tạo ra mười một chiếc bóng, dù không có cọc nào bị gãy hay nghiêng khỏi mặt đất. Khoảng trống không bóng nằm đúng vị trí trung tâm của vòng cung, như thể nơi đó dành cho một người mà ngôi làng không còn nhớ."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cọc thứ mười hai không có bóng vì nó đánh dấu vị trí của người bị xóa khỏi ký ức."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_stakes",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_find_hidden_box": {
      "meta": {
        "title": "Hộp chôn dưới đất",
        "buttonLabel": "Mở hộp",
        "desc": "Một hộp gỗ được chôn gần vòng cọc, nắp đóng kín và trên mặt có dấu niêm phong của đội sơ tán. Phù hiệu kim loại tìm thấy dưới giếng mang cùng ký hiệu, cho biết đây là vật chứng được chôn có chủ ý chứ không phải đồ thất lạc. Bên trong hộp là những mảnh ảnh gia đình bị xé rời, cần ghép lại để nhận diện đứa trẻ."
      },
      "set": {
        "display": "show",
        "password": "puzzle:pw_photo",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "class_photo"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bức ảnh hoàn chỉnh cho thấy Linh đứng giữa những người đã mất tích."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_hidden_box",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Phù hiệu đội sơ tán chưa được tìm thấy. Dấu niêm phong trên hộp cần được đối chiếu trước khi mở."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "well_badge"
          }
        ]
      }
    },
    "action_repair_mill": {
      "meta": {
        "title": "Cối xay nước",
        "buttonLabel": "Khởi động",
        "desc": "Cối xay nước đã ngừng hoạt động từ lâu; bánh xe mục kẹt trên trục và cơ cấu truyền động thiếu một chốt kim loại. Hộp bánh răng dưới sàn còn giữ đúng bộ phận thay thế, trong khi mảnh bản đồ ở trường học ghi chú chiều xoay ngược để nhả chốt cửa sập. Đây là lối cơ giới duy nhất nối cối xay với đường hầm dưới đê."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_powered",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cối xay dừng lại. Cửa sập dưới sàn mở ra lối xuống đường hầm."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_mill",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_running"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Cối xay chưa thể khởi động: cần cả mảnh bản đồ chỉ chiều xoay và chốt truyền động thay thế."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "map_fragment"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "mill_gear_pin"
          }
        ]
      }
    },
    "action_enter_tunnel": {
      "meta": {
        "title": "Đường hầm dưới đê",
        "buttonLabel": "Khám phá",
        "desc": "Đường hầm chạy dưới chân đê, hai bên tường phủ đầy tên người và ngày tháng. Các dòng chữ được sắp theo thứ tự biến mất chứ không theo họ tên, cho thấy nơi này từng được dùng để ghi nhận một cuộc di chuyển có tổ chức. Một số đoạn đã bị cạo sửa, đặc biệt ở phần cuối danh sách."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn phát hiện danh sách sơ tán bị sửa. Có mười hai cái tên, không phải mười một."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_enter_tunnel",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_open_archive": {
      "meta": {
        "title": "Tủ hồ sơ dưới đê",
        "buttonLabel": "Mở khóa",
        "desc": "Tủ hồ sơ được đặt trong hốc bê tông dưới đê, khóa bằng loại ổ chỉ có thể mở bằng chìa chuyên dụng. Bên trong là hồ sơ vận chuyển, danh sách người qua đường hầm và cuộn phim ghi lại đêm sơ tán. Ba nguồn tư liệu phải được đặt cạnh nhau để xác định bản ghi nào đã bị sửa và điều gì thực sự xảy ra mười bảy năm trước."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Hồ sơ xác nhận ngôi làng đã bị sơ tán từ mười bảy năm trước."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Chưa thể mở tủ hồ sơ. Cần chìa khóa kho, danh sách vận chuyển lấy từ đường hầm và cuộn phim sơ tán để đối chiếu."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "archive_key"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "evacuation_film"
          }
        ]
      }
    },
    "action_confront_voice": {
      "meta": {
        "title": "Tín hiệu dưới ga",
        "buttonLabel": "Đối thoại",
        "desc": "Từ đường ray vang lên một tín hiệu méo tiếng, lặp lại nhịp phát thanh từng phát ở quảng trường. Cuộn tinh thể thu sóng lấy từ hộp loa có thể dò lại đúng tần số để tách giọng nói khỏi nhiễu. Đằng sau tín hiệu là một câu hỏi không chỉ về việc ai được cứu, mà còn về ký ức nào sẽ được giữ lại."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_voice"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Chưa có cuộn tinh thể thu sóng để dò đúng tần số của tín hiệu dưới ga."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_crystal"
          }
        ]
      }
    },
    "action_choose_fate": {
      "meta": {
        "title": "Sự giải thoát",
        "buttonLabel": "Chọn kết cục",
        "desc": "Sân ga 03:17 là điểm cuối của tuyến sơ tán và cũng là nơi những lời kể rời rạc hội tụ. Những gì được tìm thấy trong giếng, nhà nguyện, trường học và kho hồ sơ cho thấy ký ức của làng đã bị thay đổi có chủ đích. Quyết định ở đây không đơn thuần là chọn một lối ra; nó xác định liệu sự thật được trả lại, bị chôn vùi hay tiếp tục tồn tại như một tiếng vọng."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "release"
          },
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
            "level": "warning",
            "text": "Các điều kiện giải thoát chưa hội đủ: cần khôi phục ít nhất ba mảnh ký ức, rung chuông, mở kho hồ sơ và có con dấu đội sơ tán."
          }
        ]
      },
      "requirement": {
        "ref": "release_ready"
      }
    },
    "action_ending_bury": {
      "meta": {
        "title": "Hồ sơ sơ tán",
        "buttonLabel": "Phá hủy",
        "desc": "Hồ sơ sơ tán nằm trước mặt bạn, ghi lại những cái tên mà ngôi làng đã cố quên. Đốt hoặc phá hủy chúng sẽ giữ nguyên sự yên ổn giả tạo hiện tại, nhưng cũng xóa đi cơ hội để những người bị loại khỏi ký ức được thừa nhận. Đây là lựa chọn khép lại sự việc bằng cách chôn sự thật thêm một lần nữa."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "bury"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_bury"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn chưa tìm thấy sổ khách; chưa thể xác định hồ sơ nào đang bị che giấu để đưa ra lựa chọn này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "found_guestbook",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_ending_echo": {
      "meta": {
        "title": "Tiếng vọng thứ mười hai",
        "buttonLabel": "Ở lại",
        "desc": "Tiếng vọng thứ mười hai không thuộc về bản ghi phát thanh thông thường. Nó gắn với người đã bị xóa khỏi danh sách và vẫn còn hiện diện trong ký ức của một số nhân chứng. Ở lại đồng nghĩa với việc chấp nhận nghe hết câu chuyện, kể cả khi ranh giới giữa người sống và ký ức không còn rõ ràng."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "echo"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_echo"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Chưa đủ bằng chứng về người thứ mười hai: cần xác định danh tính của họ và nghe được sự thật từ tín hiệu dưới ga."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "knows_twelve",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "voice_revealed",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_ending_depart": {
      "meta": {
        "title": "Chuyến tàu 03:17",
        "buttonLabel": "Lên tàu",
        "desc": "Chuyến tàu 03:17 dừng ở sân ga không có trên bản đồ. Tấm vé chưa bị xé là bằng chứng duy nhất cho phép bạn bước lên, nhưng nó không nói rõ chuyến tàu sẽ đưa ai đi và bỏ ai lại. Rời khỏi làng có thể chấm dứt hành trình của bạn mà không giải quyết những điều đã xảy ra."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "depart"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_depart"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn chưa có vé tàu 03:17 còn nguyên phần kiểm soát để lên chuyến tàu."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "unpunched_ticket"
          }
        ]
      }
    },
    "action_enter_well": {
      "meta": {
        "title": "Giếng đá",
        "buttonLabel": "Đi tới",
        "desc": "Giếng đá nằm sát quảng trường, phủ rêu và có những vết khắc mới trên thành. Từ mặt nước vọng lên tiếng gõ đều đặn, dù không thấy ai ở dưới. Con đường ngắn từ bảng thông báo dẫn thẳng đến nơi dấu vết của người thứ mười hai bị che giấu."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_village_well"
          }
        ]
      }
    },
    "action_return_square": {
      "meta": {
        "title": "Quảng trường làng",
        "buttonLabel": "Quay lại",
        "desc": "Quảng trường là trung tâm của ngôi làng và là nơi các con đường tỏa về nhà trọ, nhà nguyện, trường học cùng khu rừng phía Bắc. Bảng thông báo và hộp loa nằm gần cổng, giữ lại những dấu vết đầu tiên về danh sách dân làng đã bị sửa."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_village_square"
          }
        ]
      }
    },
    "action_return_inn": {
      "meta": {
        "title": "Sảnh nhà trọ",
        "buttonLabel": "Quay lại",
        "desc": "Sảnh nhà trọ nằm phía trên căn hầm rượu và quầy lễ tân vẫn là nơi lưu cuốn sổ khách. Những lời khai của Bà Hạnh cùng căn phòng thứ bảy có thể giúp nối các vật chứng dưới hầm với đêm mất điện."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_inn"
          }
        ]
      }
    },
    "action_enter_tower": {
      "meta": {
        "title": "Tháp chuông",
        "buttonLabel": "Đi lên",
        "desc": "Cầu thang hẹp dẫn từ gian cầu nguyện lên tháp chuông. Trên đó treo quả chuông đã câm lặng suốt mười bảy năm, bên cạnh là mặt đồng hồ dừng ở thời điểm liên quan đến vụ mất tích. Cơ cấu bên trong vẫn còn dấu vết của lần tháo dỡ có chủ ý."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel_tower"
          }
        ]
      }
    },
    "action_return_chapel": {
      "meta": {
        "title": "Gian nhà nguyện",
        "buttonLabel": "Quay lại",
        "desc": "Gian nhà nguyện lưu bản thánh ca và những lời giải thích về ba hồi chuông. Trở xuống đây giúp đối chiếu ghi chú tìm được trong gáy sách với cơ cấu chuông trên tháp."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel"
          }
        ]
      }
    },
    "action_enter_clearing": {
      "meta": {
        "title": "Khoảng đất trống",
        "buttonLabel": "Đi tới",
        "desc": "Khoảng đất trống nằm sâu trong rừng, nơi các vệt sơn hội tụ thành một vòng cọc gỗ. Mười hai cọc được dựng thành hình cung, cạnh đó là dấu đất mới xới cho thấy có vật chứng bị chôn xuống."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_forest_clearing"
          }
        ]
      }
    },
    "action_return_forest": {
      "meta": {
        "title": "Lối mòn trong rừng",
        "buttonLabel": "Quay lại",
        "desc": "Lối mòn dưới tán thông là tuyến quay lại khu rừng phía Bắc. Các dấu sơn trên thân cây giúp nhận ra đường đi dù địa hình thường thay đổi, đồng thời hé lộ tuyến vận chuyển từng dẫn xuống bờ đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_north_forest"
          }
        ]
      }
    },
    "action_travel_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "buttonLabel": "Di chuyển tới",
        "desc": "Nhà trọ Bà Hạnh nằm trên con đường lát đá rời quảng trường. Đây là nơi lưu cuốn sổ khách, lời khai về căn phòng thứ bảy và lối xuống hầm rượu bị giấu sau quầy lễ tân."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_inn"
          }
        ]
      }
    },
    "action_travel_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "buttonLabel": "Di chuyển tới",
        "desc": "Nhà nguyện nằm cuối con đường nơi tiếng chuông đã im bặt từ mười bảy năm trước. Bản thánh ca trong gian cầu nguyện giữ mật từ và quy tắc ba hồi chuông cần thiết để hiểu chuyện gì đã xảy ra."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel"
          }
        ]
      }
    },
    "action_travel_school": {
      "meta": {
        "title": "Trường học bỏ hoang",
        "buttonLabel": "Di chuyển tới",
        "desc": "Trường tiểu học bỏ hoang nằm bên con đường có những dấu chân nhỏ dẫn vào lớp số 3. Hồ sơ lớp học và bức ảnh bị xé là những bằng chứng quan trọng về người thứ mười hai."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_abandoned_school"
          }
        ]
      }
    },
    "action_travel_forest": {
      "meta": {
        "title": "Rừng thông phía Bắc",
        "buttonLabel": "Di chuyển tới",
        "desc": "Rừng thông phía Bắc bắt đầu ở rìa làng, nơi những vệt sơn lặp lại trên thân cây. Con đường ở đây không ổn định, nhưng các dấu mốc dẫn đến khoảng đất nghi lễ và tuyến xuống chân đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_north_forest"
          }
        ]
      }
    },
    "action_travel_mill": {
      "meta": {
        "title": "Cối xay nước",
        "buttonLabel": "Di chuyển tới",
        "desc": "Cối xay nước nằm cạnh dòng suối đã cạn ở phía Bắc. Bánh xe dừng hoạt động che giấu một cửa sập dưới sàn, nối công trình cũ với đường hầm chạy dưới chân đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_watermill"
          }
        ]
      }
    },
    "action_return_mill": {
      "meta": {
        "title": "Phòng máy cối xay",
        "buttonLabel": "Quay lại",
        "desc": "Phòng máy dưới chân đê chứa hộp bánh răng và trục truyền động của cối xay. Chốt kim loại bị cong là nguyên nhân khiến bánh xe ngừng quay; khi sửa đúng cơ cấu, cửa sập dẫn xuống đường hầm sẽ hoạt động."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_watermill"
          }
        ]
      }
    },
    "action_reach_station": {
      "meta": {
        "title": "Ga tàu 03:17",
        "buttonLabel": "Tìm đường tới",
        "desc": "Ga tàu 03:17 không xuất hiện trên bản đồ làng và chỉ hiện ra ở cuối tuyến đường hầm. Những manh mối về cuộc sơ tán, danh sách vận chuyển và kho hồ sơ phải được ghép lại trước khi có thể tìm thấy sân ga."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_ghost_station"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Lối tới sân ga chưa hiện ra: cần ít nhất ba mảnh ký ức, mở kho hồ sơ và thu được danh sách vận chuyển."
          }
        ]
      },
      "requirement": {
        "ref": "station_ready"
      }
    },
    "action_descend_tunnel": {
      "meta": {
        "title": "Cửa sập cối xay",
        "buttonLabel": "Mở",
        "desc": "Cửa sập nằm dưới sàn cối xay, nối phòng máy với đường hầm dưới chân đê. Một hệ đối trọng giữ cánh cửa khóa chặt khi bánh xe đứng yên; khi trục truyền động hoạt động, sức kéo mới đủ nâng cửa và để lộ bậc thang đi xuống."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_levee_tunnel"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Cơ cấu truyền động chưa hoạt động; bánh xe cối xay phải được sửa và khởi động trước khi cửa sập có thể nâng lên."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "mill_powered",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_decode_broadcast": {
      "meta": {
        "title": "Hộp loa phát thanh",
        "buttonLabel": "Tháo",
        "desc": "Hộp loa phát thanh được gắn sau bảng thông báo ở quảng trường. Tiếng gọi tên dân làng phát ra đều đặn nhưng không có dấu hiệu của người điều khiển trực tiếp; phía sau bảng mạch là một cuộn tinh thể có thể lưu và dò lại tần số của bản ghi."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "radio_crystal"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_broadcast",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Cuộn tinh thể thu sóng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_decode_broadcast",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_square_broadcast_decoded"
          }
        ]
      }
    },
    "action_return_view_village_square": {
      "meta": {
        "title": "Quảng trường — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, quảng trường hiện ra cùng bảng thông báo, hộp loa và những con đường tỏa về các khu vực khác. Lùi lại giúp quan sát cách các dấu vết nằm trong cùng một không gian, thay vì chỉ tập trung vào một vật thể riêng lẻ."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_square_fogbound"
          }
        ]
      }
    },
    "action_retrieve_well_badge": {
      "meta": {
        "title": "Phù hiệu dưới giếng",
        "buttonLabel": "Thu hồi",
        "desc": "Một vật kim loại mắc trong hốc đá dưới mực nước cũ, chỉ lộ ra khi ánh sáng chiếu đúng góc. Mép phù hiệu bị bám cặn nhưng ký hiệu đội sơ tán vẫn còn nguyên, trùng với dấu niêm phong trên chiếc hộp chôn trong rừng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "well_badge"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_well_badge",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Phù hiệu đội sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_retrieve_well_badge",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_well_bottom_revealed"
          }
        ]
      }
    },
    "action_return_view_village_well": {
      "meta": {
        "title": "Giếng đá — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, giếng đá nằm sát quảng trường và phần thành có bốn vạch khắc mới. Vết cào kim loại, hốc đá dưới mực nước cũ và mặt giếng tạo thành một chuỗi dấu vết liên quan đến vật bị giấu bên dưới."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_well_echoes"
          }
        ]
      }
    },
    "action_find_spare_key": {
      "meta": {
        "title": "Ngăn kéo sau quầy lễ tân",
        "buttonLabel": "Tìm chìa khóa",
        "desc": "Ngăn kéo sau quầy lễ tân bị khóa riêng, khác với các ngăn chứa sổ sách thông thường. Bên trong có một chìa khóa đồng mang số bảy; nó mở cánh cửa không xuất hiện trên sơ đồ nhà trọ và giải thích vì sao Bà Hạnh luôn khẳng định chỉ có sáu phòng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "spare_room_key"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hidden_room",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Chìa khóa phòng thứ bảy."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_spare_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_hidden_room"
          }
        ]
      }
    },
    "action_return_view_inn": {
      "meta": {
        "title": "Nhà trọ — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, quầy lễ tân, hành lang và những cánh cửa phòng hiện rõ trong cùng một bố cục. Có bảy cửa dọc hành lang dù lời Bà Hạnh chỉ thừa nhận sáu phòng; ngăn kéo sau quầy là nơi giữ chìa khóa cho phần bị bỏ sót."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_unsettled"
          }
        ]
      }
    },
    "action_find_evacuation_film": {
      "meta": {
        "title": "Hộp thiếc trong hầm rượu",
        "buttonLabel": "Lấy cuộn phim",
        "desc": "Hộp thiếc nằm khuất sau kệ rượu, được bọc để tránh ẩm và bụi. Cuộn phim bên trong ghi lại đám đông tập trung ở bờ đê trước đêm mất điện, cung cấp hình ảnh đối chứng cho danh sách vận chuyển và lời kể trong cuộn băng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "evacuation_film"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_film",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Cuộn phim sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_evacuation_film",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_cellar_recording_found"
          }
        ]
      }
    },
    "action_return_view_inn_cellar": {
      "meta": {
        "title": "Hầm rượu — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, căn hầm hiện ra với các thùng rượu, kệ gỗ và lối cầu thang dẫn lên nhà trọ. Những vật được giấu ở đây không phải đồ dự trữ thông thường: cuộn băng và hộp thiếc chứa phim đều liên quan đến đêm sơ tán."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_cellar_open"
          }
        ]
      }
    },
    "action_find_hymn_note": {
      "meta": {
        "title": "Trang ghi chú trong thánh ca",
        "buttonLabel": "Tìm",
        "desc": "Phần gáy bản thánh ca dày hơn các trang còn lại và có đường chỉ khâu không đồng màu. Bên trong là một trang ghi chú được gấp nhỏ, giải thích ý nghĩa của ba hồi chuông và vì sao hồi thứ tư không được vang lên."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "hymn_note"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hymn_note",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Trang ghi chú trong thánh ca."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_hymn_note",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_chapel_cryptic_note"
          }
        ]
      }
    },
    "action_return_view_chapel": {
      "meta": {
        "title": "Nhà nguyện — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, gian cầu nguyện vẫn giữ nguyên những hàng ghế và giá sách phủ bụi. Bản thánh ca nằm ở vị trí dễ thấy, nhưng phần ghi chú quan trọng lại bị giấu trong gáy sách, cạnh những dòng nhắc đến ba hồi chuông."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_chapel_silent"
          }
        ]
      }
    },
    "action_recover_bell_wire": {
      "meta": {
        "title": "Dây đồng chuông",
        "buttonLabel": "Thu hồi",
        "desc": "Đoạn dây đồng còn mắc quanh bánh răng của cơ cấu chuông, một đầu bị tuột khỏi trục truyền lực. Dấu xoắn trên dây cho thấy nó từng được tháo ra chứ không tự đứt; đoạn dây này có thể nối lại bộ phận truyền động trên tháp."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "bell_copper_wire"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_bell_wire",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Dây đồng chuông."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_bell_wire",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_bell_mechanism_repaired"
          }
        ]
      }
    },
    "action_return_view_chapel_tower": {
      "meta": {
        "title": "Tháp chuông — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, quả chuông treo trên xà gỗ phía trên mặt đồng hồ đã dừng. Trục bánh răng, dây đồng bị tháo và vị trí trống của quả lắc cho thấy cơ cấu bị vô hiệu hóa theo từng bộ phận."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_bell_chamber"
          }
        ]
      }
    },
    "action_recover_class_register": {
      "meta": {
        "title": "Ngăn bàn cuối lớp",
        "buttonLabel": "Lấy sổ điểm danh",
        "desc": "Ngăn bàn cuối lớp bị đóng đinh, khác với những ngăn còn lại đã bị lục soát. Bản sao sổ điểm danh bên trong vẫn giữ sĩ số mười hai học sinh vào ngày sơ tán, dù tên của một em đã bị bôi đen ở các hồ sơ khác."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "class_register_copy"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_class_register",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Bản sao sổ điểm danh."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_class_register",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_archive_open"
          }
        ]
      }
    },
    "action_return_view_abandoned_school": {
      "meta": {
        "title": "Trường học — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, lớp học số 3 hiện ra với dãy bàn, bảng đen và ngăn bàn giáo viên bị bỏ ngỏ. Sơ đồ chỗ ngồi không khớp với số học sinh trong bản sao sổ điểm danh; bức ảnh tập thể bị xé nằm ngay cạnh khoảng trống ấy."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_erased"
          }
        ]
      }
    },
    "action_collect_forest_compass": {
      "meta": {
        "title": "La bàn người dẫn đường",
        "buttonLabel": "Nhặt",
        "desc": "La bàn cũ mắc dưới gốc cây có hai vệt sơn song song. Mặt sau khắc tuyến đường từ rừng xuống chân đê, cho thấy người dẫn đường từng dùng nó để đưa người qua địa hình thay đổi mà không phụ thuộc vào lối mòn."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "guide_compass"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_forest_route",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: La bàn người dẫn đường."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_collect_forest_compass",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_markers_aligned"
          }
        ]
      }
    },
    "action_return_view_north_forest": {
      "meta": {
        "title": "Rừng thông — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, lối mòn xuyên rừng và các dấu sơn trên thân thông tạo thành một tuyến không liên tục. Những dấu mốc này vừa giúp định hướng qua mê cung, vừa đánh dấu con đường vận chuyển về phía bờ đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_path_shifting"
          }
        ]
      }
    },
    "action_find_wooden_seal": {
      "meta": {
        "title": "Con dấu đội sơ tán",
        "buttonLabel": "Tìm",
        "desc": "Phiến đá nằm giữa vòng cọc có mép bị xê dịch, để lộ một hốc đất nhỏ bên dưới. Trong hốc là con dấu gỗ của đội sơ tán, vật từng dùng để xác nhận danh sách chính thức trước khi niêm phong hồ sơ."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "evacuation_seal"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Con dấu đội sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_wooden_seal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_clearing_ritual_trace"
          }
        ]
      }
    },
    "action_return_view_forest_clearing": {
      "meta": {
        "title": "Khoảng đất trống — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, mười hai cọc gỗ tạo thành vòng cung quanh khoảng đất giữa rừng. Hộp chôn nằm lệch khỏi tâm vòng, còn phiến đá có con dấu ở vị trí trung tâm; hai nơi cất giữ vật chứng của cùng một cuộc sơ tán."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_clearing"
          }
        ]
      }
    },
    "action_find_gear_pin": {
      "meta": {
        "title": "Hộp bánh răng cối xay",
        "buttonLabel": "Tìm chốt",
        "desc": "Hộp bánh răng dưới sàn cối xay có nắp bị kẹt và dấu dầu khô quanh bản lề. Bên trong là chốt truyền động bị cong, đúng bộ phận còn thiếu trên trục máy; nếu không thay chốt, bánh xe không thể truyền lực để nâng cửa sập."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "mill_gear_pin"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_gear_pin",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Chốt truyền động."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_gear_pin",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_gear_inspected"
          }
        ]
      }
    },
    "action_return_view_watermill": {
      "meta": {
        "title": "Cối xay nước — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, bánh xe, trục truyền động và tấm che hộp số cho thấy cối xay đã ngừng hoạt động từ lâu. Dấu nước cạn dưới chân máy và chốt bị cong trong hộp bánh răng giải thích vì sao cơ cấu không còn đủ lực vận hành cửa sập."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_stalled"
          }
        ]
      }
    },
    "action_recover_tunnel_manifest": {
      "meta": {
        "title": "Ống tài liệu trong đường hầm",
        "buttonLabel": "Lấy danh sách",
        "desc": "Ống tài liệu được giấu sau một viên gạch rỗng trong đường hầm và có lớp bọc chống ẩm. Danh sách bên trong ghi tên những người được vận chuyển qua đây theo từng lượt, cung cấp bằng chứng trực tiếp về tuyến sơ tán mà hồ sơ làng đã phủ nhận."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "tunnel_manifest"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_tunnel_manifest",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Danh sách vận chuyển."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_tunnel_manifest",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_tunnel_manifest_found"
          }
        ]
      }
    },
    "action_return_view_levee_tunnel": {
      "meta": {
        "title": "Đường hầm dưới đê — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, đường hầm kéo dài dưới chân đê với những cái tên và ngày tháng khắc dọc hai bên tường. Một đoạn tường mới được trám vữa che vị trí ống tài liệu, còn lối sâu hơn dẫn về phía sân ga 03:17."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_tunnel_names"
          }
        ]
      }
    },
    "action_find_station_ticket": {
      "meta": {
        "title": "Khe dưới hàng ghế chờ",
        "buttonLabel": "Tìm vé",
        "desc": "Dưới hàng ghế chờ có một khe gỗ bị bung khỏi khung, đủ rộng để giấu một tấm vé. Vé tàu bên trong vẫn còn nguyên phần kiểm soát, mang giờ khởi hành 03:17 và là bằng chứng rằng sân ga từng phục vụ một chuyến tàu thực sự."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "unpunched_ticket"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_station_ticket",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Vé tàu chưa xé."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_station_ticket",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_station_departure_records"
          }
        ]
      }
    },
    "action_return_view_ghost_station": {
      "meta": {
        "title": "Ga tàu ma — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Từ góc nhìn tổng thể, sân ga vắng người nằm dưới bảng giờ dừng ở 03:17. Hàng ghế chờ, đường ray và lối vào đường hầm đều hướng về cùng một điểm; nơi này giống một ga tập kết bị xóa khỏi bản đồ hơn là một nhà ga đang hoạt động."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_station_0317"
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
            "jump": "truth",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "trust_mai",
                "value": 1
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "knows_twelve",
                "value": true
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "item",
                "subtype": "add",
                "target": "red_umbrella"
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Mai trao chiếc ô đỏ. Bên trong cán ô có khắc tên người thứ mười hai."
              }
            ]
          },
          {
            "id": "mai_silence",
            "text": "Không ép cô ấy",
            "jump": "silence",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "trust_mai",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Mai tin bạn đủ để không rời khỏi quảng trường."
              }
            ]
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
            "jump": "answer",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "found_guestbook",
                "value": true
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Bà Hạnh xác nhận cuốn sổ ghi những người chưa thể rời làng."
              }
            ]
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
            "jump": "answer",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Người giữ nhà nguyện tiết lộ: ba hồi chuông gọi ký ức, hồi thứ tư xóa ngôi làng."
              }
            ]
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
            "jump": "reveal",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "voice_revealed",
                "value": true
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Tín hiệu xác nhận ngôi làng là ký ức tập thể của những người không chấp nhận cuộc sơ tán."
              }
            ]
          }
        ]
      }
    }
  },
  "characters": {
    "player": {
      "meta": {
        "name": "An",
        "desc": "An tỉnh dậy tại quảng trường làng mà không nhớ rõ mình đã đến đây bằng cách nào. Tên An xuất hiện trong sổ khách với ngày đến ở tương lai; những người trong làng dường như nhận ra An, nhưng mỗi người nhớ một phiên bản khác nhau. Trong hồ sơ sơ tán và danh sách lớp, cái tên ấy lại bị cạo xóa, như thể An vừa là người đã đến sau mười bảy năm, vừa là người chưa từng được phép rời đi."
      },
      "set": {
        "linkEffect": false,
        "alert": null,
        "moving": false,
        "move": null
      },
      "stats": {
        "memory": {
          "current": 0,
          "max": 5,
          "label": "Ký ức"
        },
        "composure": {
          "current": 3,
          "max": 5,
          "label": "Bình tĩnh"
        },
        "resolve": {
          "current": 2,
          "max": 5,
          "label": "Ý chí"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_village_square",
        "currentIndex": 0
      },
      "moveList": [],
      "effect": {
        "leave": {}
      }
    },
    "mai": {
      "meta": {
        "name": "Mai",
        "desc": "Người bán hàng trẻ ở quảng trường. Cô thường giữ quầy đóng cửa mỗi khi loa phát thanh đọc tên người mất tích, và luôn đứng cách miệng giếng một khoảng vừa đủ để không phải nhìn xuống. Mai nhớ rõ đêm có mười hai người biến mất, nhưng ký ức của cô bị đứt đoạn đúng lúc người thứ mười hai xuất hiện. Cô không nói dối hoàn toàn; điều cô kể là phần sự thật mà cô có thể chịu đựng."
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
        },
        "guilt": {
          "current": 3,
          "max": 5,
          "label": "Mặc cảm",
          "unknown": true
        },
        "memory": {
          "current": 2,
          "max": 5,
          "label": "Ký ức",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_village_square",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_village_square",
          "countVisited": 0,
          "nextStep": 30
        }
      ]
    },
    "hanh": {
      "meta": {
        "name": "Bà Hạnh",
        "desc": "Chủ nhà trọ, người quản lý chìa khóa và sổ ghi khách đến – khách đi. Bà có thói quen kiểm tra phòng trống trước khi trời tối, dù luôn khẳng định nhà trọ chỉ có sáu phòng. Bà nhớ chính xác những người từng ở lại nhưng không thể nhớ ai đã đặt phòng cho bạn. Sự bình thản của bà giống một quy tắc tự vệ đã được lặp lại quá lâu, hơn là thái độ của người không biết chuyện."
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
        },
        "guilt": {
          "current": 3,
          "max": 5,
          "label": "Mặc cảm",
          "unknown": true
        },
        "knowledge": {
          "current": 4,
          "max": 5,
          "label": "Hiểu biết",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_inn",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_inn",
          "countVisited": 0,
          "nextStep": 45
        }
      ]
    },
    "keeper": {
      "meta": {
        "name": "Người giữ nhà nguyện",
        "desc": "Người đàn ông trông coi nhà nguyện và tháp chuông. Ông nói chuông không dùng để báo giờ mà để gọi những người còn nhớ; vì thế ông không bao giờ rung chuông nếu chưa biết chính xác mình đang gọi ai. Ông hiểu cơ cấu chuông đã bị tháo rời và biết ý nghĩa của ba hồi ngân trong đêm sơ tán. Niềm tin của ông không đem lại sự thanh thản: nó buộc ông phải tiếp tục canh giữ một lời hứa đã quá hạn."
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
        },
        "remorse": {
          "current": 2,
          "max": 5,
          "label": "Day dứt",
          "unknown": true
        },
        "duty": {
          "current": 5,
          "max": 5,
          "label": "Bổn phận"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_chapel",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_chapel",
          "countVisited": 0,
          "nextStep": 60
        }
      ]
    },
    "linh": {
      "meta": {
        "name": "Linh",
        "desc": "Đứa trẻ xuất hiện trong bức ảnh lớp cũ và trong những hành lang tưởng như đã bỏ hoang. Hồ sơ nhà trường không còn tên Linh, nhưng số chỗ ngồi trong ảnh cho thấy từng có một học sinh bị cắt khỏi khung. Linh thường trả lời câu hỏi bằng những chi tiết rất nhỏ – màu phấn, tiếng trống, vị trí chiếc cặp – như thể ký ức lớn hơn đã bị ai đó lấy mất. Không rõ Linh là một nhân chứng còn sống, một ký ức bị giữ lại hay hình ảnh mà ngôi làng tạo ra để lấp chỗ trống."
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
        },
        "fear": {
          "current": 4,
          "max": 5,
          "label": "Sợ hãi",
          "unknown": true
        },
        "trust": {
          "current": 0,
          "max": 5,
          "label": "Tin tưởng"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_abandoned_school",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_abandoned_school",
          "countVisited": 0,
          "nextStep": 35
        }
      ]
    },
    "voice": {
      "meta": {
        "name": "Giọng nói dưới ga",
        "desc": "Một giọng nói phát ra từ đường ray tại sân ga chỉ xuất hiện lúc 03:17. Tín hiệu bị nhiễu, lúc gần như giọng của người thân, lúc giống giọng của chính bạn. Nó biết bạn đã đến muộn mười bảy năm và gọi sự kiện năm ấy là một cuộc sơ tán chưa bao giờ kết thúc. Giọng nói không yêu cầu được cứu ngay; nó muốn bạn xác định ai đã bị xóa khỏi danh sách và liệu sự thật có nên được phát lại cho tất cả những người còn nhớ."
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
        },
        "identity": {
          "current": 1,
          "max": 5,
          "label": "Danh tính",
          "unknown": true
        },
        "memory": {
          "current": 5,
          "max": 5,
          "label": "Ký ức",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_ghost_station",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_ghost_station",
          "countVisited": 0,
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
        20,
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
