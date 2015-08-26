/* Load builds from amazon */
function keys(obj)
{
		var keys = [];
		for(var key in obj)
		{
				if(obj.hasOwnProperty(key))
				{
						keys.push(key);
				}
		}
		return keys;
}

function format_size(bytes) {
	var i = 0;
	var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	while(bytes > 1024 && i < 8)
	{
			bytes = bytes/1024;
			i++;
	} 
	return Math.max(bytes, 0.1).toFixed(1) + ' ' + units[i];
};

$(document).ready(function() {
	$('#builds').removeClass("hide-element");

	var unknown_branch = "[others]"
	var master_branch = "master"
	var builds = new Array();
	var branches = [];

	function add_build(branch, commit, platform, last_modified, build)
	{
		if(!builds.hasOwnProperty(branch))
		{
			builds[branch] = new Array();
			branches.push(branch);
		}
		if(!builds[branch].hasOwnProperty(commit))
		{
			builds[branch][commit] = {
				last_modified: last_modified,
				platforms: {
					android: null,
					win_x86: null,
					win_x64: null
				}
			}
		}
		builds[branch][commit].platforms[platform] = build;
		if(builds[branch][commit].last_modified > last_modified)
		{
			builds[branch][commit].last_modified = last_modified;
		}
	}

	function print_builds(element)
	{
		// Create a sorted list of branches
		branches.sort();
		var pos = branches.indexOf(master_branch)
		if (pos > 0)
		{
			branches.splice(pos, 1);
			branches.unshift(master_branch);
		}
		pos = branches.indexOf(unknown_branch)
		if (pos >= 0)
		{
			branches.splice(pos, 1);
			branches.push(unknown_branch);
		}

		var el_table = $('<table></table>');

		// Loop over braches
		for(i = 0; i < branches.length; i++)
		{
			var branch_name = branches[i];
			var branch = builds[branch_name];
			el_table.append('<tr><th colspan="3" class="branch" id="' + branch_name +  '">' + branch_name + '</th></tr>');
			el_table.append('<tr><th>Commit</th><th>Date</th><th><img src="http://i.imgur.com/nK9exQe.jpg" /> Android</th><th><img src="http://i.imgur.com/hAuMmjF.png" /> Win_x86</th><th><img src="http://i.imgur.com/hAuMmjF.png" /> Win_x64</th></tr>');

			// Create a sorted list of commit ids
			var commit_ids = keys(branch).sort(function(a, b)
			{
				var date_a = branch[a].last_modified;
				var date_b = branch[b].last_modified
				return ((date_a > date_b) ? -1 : ((date_a < date_b) ? 1 : 0));
			});

			for(var j = 0; j < commit_ids.length; j++)
			{
				var s_trclass = ((j % 2) == 0) ? ' class="even"' : '';
				var commit_id = commit_ids[j];
				var commit = branch[commit_id];
				var s_date = commit.last_modified.toISOString();
				var s_commit = '<a href="https://github.com/reicast/reicast-emulator/commit/' + commit_id + '" data-action="info" data-build="' + commit_id + '">'+ commit_id +'</a>';
				s_android = (commit.platforms.android == null) ? '' : '<a data-action="download" data-build="' + commit_id + '" href="http://reicast-builds.s3.amazonaws.com/' + commit.platforms.android.path + '">APK</a> (' + format_size(commit.platforms.android.filesize) + ')';
				s_win86 = (commit.platforms.win_x86   == null) ? '' : '<a data-action="download" data-build="' + commit_id + '" href="http://reicast-builds-windows.s3.amazonaws.com/' + commit.platforms.win_x86.path + '">ZIP</a> (' + format_size(commit.platforms.win_x86.filesize) + ')';
				s_win64 = (commit.platforms.win_x64   == null) ? '' : '<a data-action="download" data-build="' + commit_id + '" href="http://reicast-builds-windows.s3.amazonaws.com/' + commit.platforms.win_x64.path + '">ZIP</a> (' + format_size(commit.platforms.win_x64.filesize) + ')';
				el_table.append('<tr'+s_trclass+'><td class="commit">' + s_commit  + '</td><td class="date">' + commit.last_modified.toISOString() + '</td><td>' + s_android + '</td><td>' + s_win86 + '</td><td>' + s_win64 + '</td></tr>');
			}
		}

		$(element).empty();
		$(element).append(el_table);
	}

	$.when(
		// Get the Android builds
		$.get("https://reicast-builds.s3.amazonaws.com/"),

		// Get the Windows builds
		$.get("https://reicast-builds-windows.s3.amazonaws.com/")
	).then(function(xml_android, xml_windows)
	{
		// Parse the Android builds
		contents = xml_android[2].responseXML.getElementsByTagName('Contents');
		for(i = 0; i < contents.length; i++)
		{
			var path = contents[i].getElementsByTagName('Key')[0].firstChild.data;
			var branch = path.indexOf("builds/heads") == 0 && path.replace(/^builds\/heads\//,"").replace(/\/[^\/]*$/,"").replace(/\-[^\-]*$/,"") || unknown_branch;
			var name = path.substring(path.lastIndexOf("/") + 1);
			var commit = name.substring(name.lastIndexOf("-")+1, name.lastIndexOf(".")).substring(0, 7);
			var filesize = contents[i].getElementsByTagName('Size')[0].firstChild.data;
			var last_modified = new Date(contents[i].getElementsByTagName('LastModified')[0].firstChild.data);
			add_build(branch, commit, "android", last_modified, {
				name: name,
				path: path,
				filesize: filesize,
				last_modified: last_modified
			});
		}

		// Parse the Windows builds
		contents = xml_windows[2].responseXML.getElementsByTagName('Contents');
		for(i = 0; i < contents.length; i++)
		{
			var path = contents[i].getElementsByTagName('Key')[0].firstChild.data;
			var branch = path.indexOf("builds/heads") == 0 && path.replace(/^builds\/heads\//,"").replace(/\/[^\/]*$/,"").replace(/\-[^\-]*$/,"") || unknown_branch;
			var name = path.substring(path.lastIndexOf("/") + 1);
			var commit = name.substring(name.lastIndexOf("-") + 1, name.lastIndexOf(".")).substring(0, 7);
			var last_modified = new Date(contents[i].getElementsByTagName('LastModified')[0].firstChild.data);
			var filesize = contents[i].getElementsByTagName('Size')[0].firstChild.data;
			var platform = name.substring(name.indexOf("-") + 1, name.indexOf("-") + 8)
			add_build(branch, commit, platform, last_modified, {
				name: name,
				path: path,
				filesize: filesize,
				last_modified: last_modified
			});
		}

		print_builds("#builds");
	});
});