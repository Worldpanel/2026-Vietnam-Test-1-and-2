// ===== Question Bank (content only) =====
// Each entry: { key:"unique", text:"Question text", options:[{value:"A",label:"A. ..."}, ...], extraHTML?: "<table>...</table>" }

window.QUESTION_BANK = [
  // ---------- TEST 1 ----------
  { key:"q1_1", text:"Which of the following fractions is less than one-third?", options:[
    {value:"A",label:"A. 22/63"}, {value:"B",label:"B. 4/11"}, {value:"C",label:"C. 15/46"},
    {value:"D",label:"D. 33/98"}, {value:"E",label:"E. 102/103"}
  ]},
  { key:"q1_2", text:"When it is noon at prime meridian on the equator, what time is it at 75° north latitude on this meridian?", options:[
    {value:"A",label:"A. 12 noon"}, {value:"B",label:"B. 3 pm"}, {value:"C",label:"C. 5 pm"},
    {value:"D",label:"D. 7 am"}, {value:"E",label:"E. Midnight"}
  ]},
  { key:"q1_3", text:"A carpenter needs four boards, each 2 metres 70 cm long. If wood is sold only by the metre, how many metres must he buy?", options:[
    {value:"A",label:"A. 9"}, {value:"B",label:"B. 10"}, {value:"C",label:"C. 11"}, {value:"D",label:"D. 12"}, {value:"E",label:"E. 13"}
  ]},

  // ---------- TEST 2 (with table placeholder) ----------
  { key:"q2_1_1", text:"The percentage of employees in the non-competitive class has been constantly increasing since 1902.", extraHTML: `
    <p><strong>Table: Employees in Civil Service (1902–1937)</strong></p>
    <table>
      <tr><th>Year</th><th>Total</th><th>Competitive</th><th>Labour</th><th>Non-Competitive</th></tr>
      <tr><td>1902</td><td>34</td><td>20</td><td>12</td><td>2</td></tr>
      <tr><td>1906</td><td>42</td><td>24</td><td>16</td><td>2</td></tr>
      <tr><td>1910</td><td>54</td><td>30</td><td>18</td><td>6</td></tr>
      <tr><td>1914</td><td>55</td><td>31</td><td>18</td><td>6</td></tr>
      <tr><td>1918</td><td>53</td><td>31</td><td>16</td><td>6</td></tr>
      <tr><td>1922</td><td>60</td><td>35</td><td>17</td><td>8</td></tr>
      <tr><td>1926</td><td>73</td><td>44</td><td>20</td><td>9</td></tr>
      <tr><td>1930</td><td>90</td><td>52</td><td>26</td><td>12</td></tr>
      <tr><td>1933</td><td>90</td><td>50</td><td>25</td><td>15</td></tr>
      <tr><td>1937</td><td>112</td><td>63</td><td>30</td><td>19</td></tr>
    </table>
  `, options:[{value:"A",label:"A. Correct"},{value:"B",label:"B. Incorrect"}]},

  // TODO: Paste the rest of your questions here (q1_4..q1_32, q2_1_2..q2_4_3) using the same structure.
];
