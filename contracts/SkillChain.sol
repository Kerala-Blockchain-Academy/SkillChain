pragma solidity ^0.5.0;

contract SkillChain {

	struct user {
	    uint256 id;
        bytes32 fname;
        bytes32 lname;
        uint256 number;
        bytes32 uaddress;
        uint256 anumber;
        bytes32 pass;
        bytes32 usertype;
    }

    struct jobpool {
	    uint256 jobid;
        bytes32 jobname; 
        bytes32 jobloc; 
        uint256 jobduration;
        uint256 jobwage;
        bytes32 jobcontactpersion;
        uint256 jobcontact;        
    }

    struct workmen_rating {
        uint256 prkey;
        uint256 jobid;
        uint256 userid;
        bytes32 jname;
        uint256 cuserid;
        uint rateing;
        bytes32 comment;
    }

    struct applied {
        uint256 pkey;
        uint256 jobid;
        uint256 userid;
        bytes32 jname;
    }

    
    uint256 applied_count = 0;
    mapping(uint256 => applied) m_applied;

    mapping(uint256 => user) m_user;
    user[] public um;

    uint128 jobpool_count = 0;
    mapping(uint256 => jobpool) m_jobpool;

    uint256 workmen_rating_count;
    mapping(uint256 => workmen_rating) m_workmen_rating;

    function newUser (uint256 _id, bytes32 _pass,bytes32 _fname,bytes32 _lname,bytes32 _uaddress,uint256 _number,uint256 _anumber,bytes32 _usertype) public {
        SkillChain.user memory usernew = user(_id,_fname,_lname,_number,_uaddress,_anumber,_pass,_usertype);
        m_user[_id] = usernew;
        um.push(usernew);
    }

    function jobApplied (uint256 _jobid,uint256 _userid,bytes32 _jname) public {
        applied_count++;
        m_applied[applied_count] = applied(applied_count,_jobid,_userid,_jname);
    }

    function newJobpool (bytes32 _jobname,bytes32 _jobloc,uint256 _jobduration,uint256 _jobwage,bytes32 _jobcontactpersion,uint256 _jobcontact) public {
        jobpool_count++;
        m_jobpool[jobpool_count] = jobpool(jobpool_count,_jobname,_jobloc,_jobduration, _jobwage,_jobcontactpersion,_jobcontact);
    }

    function newWorkmenRating (uint256 _jobid,uint256 _userid,bytes32 _jname,uint256 _cuserid,uint _rateing,bytes32 _comment) public {
        workmen_rating_count++;
        m_workmen_rating[workmen_rating_count] = workmen_rating(workmen_rating_count,_jobid,_userid,_jname,_cuserid,_rateing,_comment);
    }

      function jobPoolCount () view public returns (uint256) {
        return jobpool_count;
    }
      function workmenRatingCount () view public returns (uint256) {
        return workmen_rating_count;
    } 

    function getRating(uint256 id) view public returns(uint256,uint256,bytes32,uint256,uint,bytes32) {
         return(m_workmen_rating[id].jobid,m_workmen_rating[id].userid,m_workmen_rating[id].jname,m_workmen_rating[id].cuserid,m_workmen_rating[id].rateing,m_workmen_rating[id].comment);
    }   
    
    function getJobs(uint256 id) view public returns(uint256,bytes32,bytes32,uint256,uint256,bytes32,uint256) {
        return (m_jobpool[id].jobid, m_jobpool[id].jobname, m_jobpool[id].jobloc, m_jobpool[id].jobduration, m_jobpool[id].jobwage, m_jobpool[id].jobcontactpersion, m_jobpool[id].jobcontact);
    }
    
    function getUser(uint256 id) view public returns(bytes32,bytes32,uint256,bytes32,uint256,bytes32) {
        return (m_user[id].fname,m_user[id].lname,m_user[id].number,m_user[id].uaddress,m_user[id].anumber,m_user[id].usertype);
    }

    function getusertype(uint256 id) view public returns(bytes32,bytes32) {
     return(m_user[id].pass,m_user[id].usertype);     
    }

     function getapplied(uint256 pkey) view public returns(uint256,uint256,bytes32) {
     return(m_applied[pkey].jobid,m_applied[pkey].userid,m_applied[pkey].jname);     
     }

    function getRatings(uint256 _id) view public returns (uint256) {
        uint256 workerrating;
        uint256 dcount;
        for(uint i = 0 ; i < workmen_rating_count; i++) {
            if(m_workmen_rating[_id].jobid == _id) {
                workerrating = workerrating + m_workmen_rating[_id].rateing;
                dcount++;
            }
        }
        uint rating = workerrating / dcount;
        return rating;
    }
    

}
